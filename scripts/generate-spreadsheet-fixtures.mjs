// Generates the spreadsheet-engine e2e fixtures under tests/fixtures/spreadsheet/.
// Uses our own installed xlsx package (dogfooding) — no external tooling
// needed. Run manually whenever fixtures need to be regenerated:
//
//   node scripts/generate-spreadsheet-fixtures.mjs
//
// The generated files are committed to the repo.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "tests", "fixtures", "spreadsheet");
mkdirSync(fixturesDir, { recursive: true });

function write(name, content) {
  const path = join(fixturesDir, name);
  writeFileSync(path, content);
  console.log(`wrote ${path} (${content.length} bytes)`);
}

// --- sample.csv: quoted commas, an embedded newline, accents, emoji, BOM ---
const csvBody =
  "id,name,note\n" +
  "1,Café,Naïve tëst\n" +
  '2,Bob,"hello, world"\n' +
  '3,Multi,"line one\nline two"\n' +
  "4,🎉 Party,emoji test\n";
write("sample.csv", "﻿" + csvBody);

// --- sample.json: array of objects ---
write(
  "sample.json",
  JSON.stringify(
    [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false, note: "extra column" },
    ],
    null,
    2
  )
);

// --- malformed.json: invalid JSON syntax ---
write("malformed.json", '{"id": 1, "name": "broken"');

// --- scalar.json: valid JSON, unsupported shape (bare number) ---
write("scalar.json", "42");

// --- large.csv: 50,000 rows ---
const categories = ["alpha", "beta", "gamma", "delta"];
const lines = ["id,category,value"];
for (let i = 0; i < 50_000; i += 1) {
  lines.push(`${i},${categories[i % categories.length]},${(i * 1.5).toFixed(2)}`);
}
write("large.csv", lines.join("\n") + "\n");

// --- sample.xlsx: two sheets, incl. a date column ---
const workbook = XLSX.utils.book_new();

const dataSheet = XLSX.utils.aoa_to_sheet([
  ["id", "name", "active", "joined"],
  [1, "Alice", true, new Date("2024-01-15T00:00:00.000Z")],
  [2, "Bob", false, new Date("2024-06-01T00:00:00.000Z")],
]);
XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");

const extraSheet = XLSX.utils.aoa_to_sheet([
  ["x", "y"],
  [1, 2],
  [3, 4],
]);
XLSX.utils.book_append_sheet(workbook, extraSheet, "Extra");

const xlsxBytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
write("sample.xlsx", xlsxBytes);
