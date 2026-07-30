import { ProcessingError } from "@/lib/errors/ProcessingError";
import { serializeJson } from "@/engines/spreadsheet/serializers/json";
import type { ColumnStats, ColumnType, DatasetAnalysis, FileMetadata } from "@/engines/spreadsheet/edit/analyze";
import type { NormalizedTable } from "@/engines/spreadsheet/types";
import type {
  GetPageParams,
  ParquetColumn,
  ParquetSession,
  ParquetSummary,
  PreviewPage,
  SortDirection,
} from "./types";

type DuckDbModule = typeof import("@duckdb/duckdb-wasm");
type AsyncDuckDB = InstanceType<DuckDbModule["AsyncDuckDB"]>;
type AsyncDuckDBConnection = Awaited<ReturnType<AsyncDuckDB["connect"]>>;

interface DuckDbContext {
  duckdb: DuckDbModule;
  db: AsyncDuckDB;
}

export const MAX_SEARCH_COLUMNS = 30;

/** Wraps an identifier in double quotes, escaping any interior quotes. Column
 * names come from the file's own (untrusted) schema, not from us — this and
 * the schema whitelist in buildOrderByClause are what make it safe to splice
 * them into SQL text (SQL can't parameter-bind identifiers). */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function buildOrderByClause(
  sortColumn: string | undefined,
  sortDirection: SortDirection | undefined,
  knownColumnNames: ReadonlySet<string>
): string {
  if (!sortColumn || !knownColumnNames.has(sortColumn)) return "";
  const direction: SortDirection = sortDirection === "DESC" ? "DESC" : "ASC";
  return `ORDER BY ${quoteIdentifier(sortColumn)} ${direction}`;
}

export function buildSearchClause(
  columns: ParquetColumn[],
  searchTerm: string | undefined
): { whereClause: string; params: string[] } {
  const trimmed = searchTerm?.trim();
  if (!trimmed) return { whereClause: "", params: [] };

  const searchColumns = columns.slice(0, MAX_SEARCH_COLUMNS).map((column) => column.name);
  if (searchColumns.length === 0) return { whereClause: "", params: [] };

  const conditions = searchColumns.map(
    (name) => `CAST(${quoteIdentifier(name)} AS VARCHAR) ILIKE ?`
  );
  return {
    whereClause: `WHERE (${conditions.join(" OR ")})`,
    params: searchColumns.map(() => `%${trimmed}%`),
  };
}

const NUMERIC_TYPE_PREFIXES = [
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "HUGEINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "UBIGINT",
  "UHUGEINT",
  "FLOAT",
  "DOUBLE",
  "DECIMAL",
  "REAL",
];

/** Maps DuckDB's own type name (e.g. "BIGINT", "STRUCT(a INTEGER)") to the shared
 * `ColumnType` union the JS-side analyzer (`analyzeTable()`) also produces, so the
 * Analyze tab can render either source through one code path. */
export function mapDuckDbTypeToColumnType(duckDbType: string): ColumnType {
  const t = duckDbType.toUpperCase();
  if (t.startsWith("STRUCT") || t.startsWith("LIST") || t.startsWith("MAP") || t.endsWith("[]")) return "nested";
  if (t === "BOOLEAN") return "boolean";
  if (t === "DATE" || t === "TIME" || t.startsWith("TIMESTAMP")) return "date";
  if (NUMERIC_TYPE_PREFIXES.some((prefix) => t.startsWith(prefix))) return "number";
  return "string";
}

/** One row's worth of per-column aggregates, aliased by positional index (`c0_nulls`,
 * `c1_nulls`, ...) rather than by column name — avoids a second identifier-escaping
 * surface beyond `quoteIdentifier` for the *output* alias, since column names are
 * untrusted (the file's own schema). MIN/MAX/AVG/MEDIAN are only requested for
 * numeric-mapped columns, matching `analyzeColumn` (analyze.ts)'s existing behavior —
 * DuckDB's MEDIAN/AVG error on non-orderable/non-numeric types, so this isn't just
 * parity with the JS producer, it's also correctness. */
export function buildColumnStatsSelectClauses(columns: ParquetColumn[]): string {
  return columns
    .map((column, index) => {
      const id = quoteIdentifier(column.name);
      const base = `COUNT(*) FILTER (WHERE ${id} IS NULL) AS c${index}_nulls, COUNT(DISTINCT ${id}) AS c${index}_distinct`;
      if (mapDuckDbTypeToColumnType(column.type) !== "number") return base;
      return `${base}, MIN(${id}) AS c${index}_min, MAX(${id}) AS c${index}_max, AVG(${id}) AS c${index}_mean, MEDIAN(${id}) AS c${index}_median`;
    })
    .join(", ");
}

/** Maps whatever DuckDB throws to a user-understandable ProcessingError. */
export function toProcessingError(cause: unknown): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  const lower = message.toLowerCase();

  if (
    lower.includes("out of memory") ||
    lower.includes("bad_alloc") ||
    lower.includes("allocat")
  ) {
    return new ProcessingError(
      "OUT_OF_MEMORY",
      "Your browser ran out of memory processing this file."
    );
  }
  if (
    lower.includes("no magic bytes") ||
    lower.includes("invalid") ||
    lower.includes("corrupt") ||
    lower.includes("not a parquet file") ||
    lower.includes("failed to open")
  ) {
    return new ProcessingError(
      "MALFORMED_FILE",
      "This file doesn't look like a valid Parquet file, or it may be corrupted."
    );
  }
  return new ProcessingError(
    "UNSUPPORTED_FORMAT",
    "This Parquet file uses a feature that isn't supported yet."
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

function generateRegisteredName(): string {
  // Never the user's actual filename — sidesteps needing to sanitize it for
  // SQL/path use, and avoids collisions between sequentially opened files.
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.parquet`;
}

let contextPromise: Promise<DuckDbContext> | null = null;

function getDbContext(): Promise<DuckDbContext> {
  if (!contextPromise) {
    contextPromise = instantiate().catch((error: unknown) => {
      contextPromise = null; // allow retrying on the next call
      throw error;
    });
  }
  return contextPromise;
}

async function instantiate(): Promise<DuckDbContext> {
  // Dynamic import: this (multi-MB) engine only loads when a Parquet file is
  // actually opened, never at page load and never from any other route.
  const duckdb = await import("@duckdb/duckdb-wasm");

  // Self-hosted (see scripts/copy-duckdb-assets.mjs) — same-origin, so
  // connect-src 'self' in next.config.ts doesn't need to be relaxed and we
  // don't depend on a third-party CDN's uptime. mvp/eh only; coi (threaded)
  // needs COOP/COEP headers we don't otherwise want.
  const bundles: import("@duckdb/duckdb-wasm").DuckDBBundles = {
    mvp: {
      mainModule: "/duckdb/duckdb-mvp.wasm",
      mainWorker: "/duckdb/duckdb-browser-mvp.worker.js",
    },
    eh: {
      mainModule: "/duckdb/duckdb-eh.wasm",
      mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
    },
  };

  const bundle = await duckdb.selectBundle(bundles);
  if (!bundle.mainWorker) {
    throw new Error("DuckDB-WASM did not return a worker script for this browser.");
  }

  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker ?? undefined);

  return { duckdb, db };
}

async function runRows(
  conn: AsyncDuckDBConnection,
  sql: string,
  params: unknown[]
): Promise<Record<string, unknown>[]> {
  const table = params.length === 0 ? await conn.query(sql) : await runPrepared(conn, sql, params);
  return table.toArray().map((row) => (row as { toJSON(): Record<string, unknown> }).toJSON());
}

async function runPrepared(conn: AsyncDuckDBConnection, sql: string, params: unknown[]) {
  const stmt = await conn.prepare(sql);
  try {
    return await stmt.query(...params);
  } finally {
    await stmt.close();
  }
}

async function loadSummary(
  conn: AsyncDuckDBConnection,
  registeredName: string
): Promise<ParquetSummary> {
  const countRows = await runRows(
    conn,
    `SELECT COUNT(*) AS row_count FROM read_parquet('${registeredName}')`,
    []
  );
  const rowCount = toNumber(countRows[0]?.row_count);

  const schemaRows = await runRows(
    conn,
    `DESCRIBE SELECT * FROM read_parquet('${registeredName}')`,
    []
  );
  const columns: ParquetColumn[] = schemaRows.map((row) => ({
    name: String(row.column_name),
    type: String(row.column_type),
  }));

  return { rowCount, columns };
}

async function getPage(
  conn: AsyncDuckDBConnection,
  registeredName: string,
  columns: ParquetColumn[],
  baseRowCount: number,
  params: GetPageParams
): Promise<PreviewPage> {
  const knownColumnNames = new Set(columns.map((column) => column.name));
  const orderClause = buildOrderByClause(params.sortColumn, params.sortDirection, knownColumnNames);
  const { whereClause, params: searchParams } = buildSearchClause(columns, params.searchTerm);
  const baseFrom = `read_parquet('${registeredName}')`;

  const totalRows = whereClause
    ? toNumber(
        (
          await runRows(
            conn,
            `SELECT COUNT(*) AS row_count FROM ${baseFrom} ${whereClause}`,
            searchParams
          )
        )[0]?.row_count
      )
    : baseRowCount;

  const safePageSize = Math.min(Math.max(1, Math.floor(params.pageSize)), 1000);
  const safePage = Math.max(1, Math.floor(params.page));
  const offset = (safePage - 1) * safePageSize;

  const rows = await runRows(
    conn,
    `SELECT * FROM ${baseFrom} ${whereClause} ${orderClause} LIMIT ${safePageSize} OFFSET ${offset}`,
    searchParams
  );

  return { rows, page: safePage, pageSize: safePageSize, totalRows };
}

async function getAllRows(
  conn: AsyncDuckDBConnection,
  registeredName: string
): Promise<Array<Record<string, unknown>>> {
  return runRows(conn, `SELECT * FROM read_parquet('${registeredName}')`, []);
}

/** SQL-aggregate-based producer of the same `DatasetAnalysis` shape `analyzeTable()`
 * (engines/spreadsheet/edit/analyze.ts) produces by scanning an in-memory table —
 * scales the same way `getPage` does (never materializes the full dataset), which is
 * the whole reason Parquet's Analyze tab doesn't just call `parquetSessionToTable()`
 * first. See `tableBridge.ts`. */
async function loadAnalysis(
  conn: AsyncDuckDBConnection,
  registeredName: string,
  summary: ParquetSummary,
  fileMetadata?: FileMetadata
): Promise<DatasetAnalysis> {
  const baseFrom = `read_parquet('${registeredName}')`;
  const statsSelect = buildColumnStatsSelectClauses(summary.columns);

  const emptyStatsRows: Record<string, unknown>[] = [{}];
  const [statsRows, distinctRowsRows] = await Promise.all([
    summary.columns.length > 0 ? runRows(conn, `SELECT ${statsSelect} FROM ${baseFrom}`, []) : Promise.resolve(emptyStatsRows),
    runRows(conn, `SELECT COUNT(*) AS distinct_rows FROM (SELECT DISTINCT * FROM ${baseFrom}) t`, []),
  ]);

  const statsRow: Record<string, unknown> = statsRows[0] ?? {};
  const distinctRows = toNumber(distinctRowsRows[0]?.distinct_rows);

  const columns: ColumnStats[] = summary.columns.map((column, index) => {
    const type = mapDuckDbTypeToColumnType(column.type);
    const stats: ColumnStats = {
      name: column.name,
      type,
      nullCount: toNumber(statsRow[`c${index}_nulls`]),
      distinctCount: toNumber(statsRow[`c${index}_distinct`]),
    };
    if (type === "number") {
      stats.min = toNumber(statsRow[`c${index}_min`]);
      stats.max = toNumber(statsRow[`c${index}_max`]);
      stats.mean = toNumber(statsRow[`c${index}_mean`]);
      stats.median = toNumber(statsRow[`c${index}_median`]);
    }
    return stats;
  });

  return {
    rowCount: summary.rowCount,
    columnCount: summary.columns.length,
    columns,
    duplicateRowCount: Math.max(0, summary.rowCount - distinctRows),
    fileMetadata,
  };
}

export type OpenParquetFilePhase = "reading" | "analyzing-schema";

export async function openParquetFile(
  file: File,
  onPhase?: (phase: OpenParquetFilePhase) => void
): Promise<ParquetSession> {
  let ctx: DuckDbContext;
  try {
    ctx = await getDbContext();
  } catch {
    throw new ProcessingError(
      "WORKER_CRASH",
      "Could not start the local data engine. Try reloading the page."
    );
  }

  const { duckdb, db } = ctx;
  const registeredName = generateRegisteredName();
  const conn = await db.connect();

  try {
    // read_parquet() autoloads DuckDB's parquet extension as a separate
    // wasm binary at query time. Point it at our self-hosted copy (see
    // scripts/fetch-duckdb-extensions.mjs + the rewrite in next.config.ts)
    // instead of the default extensions.duckdb.org — otherwise our CSP
    // correctly blocks that fetch, and DuckDB's failure mode isn't a clean
    // error but a low-level wasm crash.
    await conn.query("SET custom_extension_repository = '/duckdb-ext'");

    onPhase?.("reading");
    await db.registerFileHandle(
      registeredName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true
    );

    onPhase?.("analyzing-schema");
    const summary = await loadSummary(conn, registeredName);
    const fileMetadata: FileMetadata = { fileName: file.name, fileSizeBytes: file.size, format: "Parquet" };
    let closed = false;

    return {
      summary,
      getPage: (pageParams) => {
        if (closed) {
          throw new ProcessingError("WORKER_CRASH", "This file has already been closed.");
        }
        return getPage(conn, registeredName, summary.columns, summary.rowCount, pageParams).catch(
          (cause: unknown) => {
            throw toProcessingError(cause);
          }
        );
      },
      getAllRows: () => {
        if (closed) {
          throw new ProcessingError("WORKER_CRASH", "This file has already been closed.");
        }
        return getAllRows(conn, registeredName).catch((cause: unknown) => {
          throw toProcessingError(cause);
        });
      },
      analyze: () => {
        if (closed) {
          throw new ProcessingError("WORKER_CRASH", "This file has already been closed.");
        }
        return loadAnalysis(conn, registeredName, summary, fileMetadata).catch((cause: unknown) => {
          throw toProcessingError(cause);
        });
      },
      close: async () => {
        if (closed) return;
        closed = true;
        await conn.close().catch(() => {});
        await db.dropFile(registeredName).catch(() => {});
      },
    };
  } catch (cause) {
    await conn.close().catch(() => {});
    throw toProcessingError(cause);
  }
}

function generateTempName(prefix: string, extension: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

/**
 * Converts any `NormalizedTable` to a real Parquet file, entirely client-side.
 * `serializeJson()` (already used by every other JSON export in this app) produces
 * the JSON text; that gets registered as a DuckDB-WASM virtual file and ingested via
 * `insertJSONFromPath` — the DuckDB-WASM-documented ingestion pattern — rather than
 * building `apache-arrow` `Table` objects by hand, which would need a new direct
 * dependency this avoids (`apache-arrow` is only a transitive dependency of
 * `@duckdb/duckdb-wasm` today). `COPY ... TO ... (FORMAT PARQUET)` then
 * `copyFileToBuffer()` retrieves the written bytes back out of DuckDB-WASM's
 * in-memory virtual filesystem.
 *
 * Same limitation as every other JSON-based export in this app: JSON has no native
 * date type, so a `Date` cell round-trips through this as a text column, not a
 * Parquet TIMESTAMP — not a new limitation introduced here, `serializeToJson` already
 * has it.
 */
export async function writeTableToParquet(table: NormalizedTable): Promise<Blob> {
  let ctx: DuckDbContext;
  try {
    ctx = await getDbContext();
  } catch {
    throw new ProcessingError("WORKER_CRASH", "Could not start the local data engine. Try reloading the page.");
  }

  const { db } = ctx;
  const conn = await db.connect();
  const jsonName = generateTempName("data-studio-ingest", "json");
  const outName = generateTempName("data-studio-export", "parquet");
  // Unquoted for the insertJSONFromPath `name` option (DuckDB-WASM handles that
  // identifier itself); quoted separately below wherever it's spliced into raw SQL.
  const rawTableName = `data_studio_export_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const quotedTableName = quoteIdentifier(rawTableName);

  try {
    // Same reasoning as openParquetFile: COPY TO PARQUET autoloads the parquet
    // extension too, not just read_parquet() — point it at our self-hosted copy on
    // *this* connection specifically. Each `db.connect()` call needs its own SET
    // (confirmed empirically: omitting it here reproduced a cryptic "table index is
    // out of bounds" error from the COPY step, not a clean network/CSP failure —
    // the setting doesn't carry over from openParquetFile's separate connection).
    await conn.query("SET custom_extension_repository = '/duckdb-ext'");
    await db.registerFileText(jsonName, serializeJson(table, "array-of-objects"));
    // `shape` is intentionally omitted — DuckDB-WASM auto-detects an array-of-objects
    // JSON document as row-array shape without a hint, and the "row-array" enum value
    // isn't actually part of this package's published public type exports (only its
    // internal, non-published .d.ts files declare `JSONTableShape` — confirmed by
    // checking `dist/duckdb-browser.d.ts`, the file this package's own `types` field
    // points at, and its `targets/duckdb.d.ts` re-export list, neither of which
    // includes it).
    await conn.insertJSONFromPath(jsonName, { name: rawTableName, create: true });
    await conn.query(`COPY ${quotedTableName} TO '${outName}' (FORMAT PARQUET)`);
    const buffer = await db.copyFileToBuffer(outName);
    return new Blob([buffer as BlobPart], { type: "application/octet-stream" });
  } catch (cause) {
    throw toProcessingError(cause);
  } finally {
    await conn.query(`DROP TABLE IF EXISTS ${quotedTableName}`).catch(() => {});
    await conn.close().catch(() => {});
    await db.dropFile(jsonName).catch(() => {});
    await db.dropFile(outName).catch(() => {});
  }
}
