import * as Comlink from "comlink";
import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Anything Comlink can talk to: a real Worker, or (in tests) a MessagePort.
 * `terminate` is optional since MessagePort doesn't have one.
 */
interface TerminatableEndpoint extends Comlink.Endpoint {
  terminate?: () => void;
}

export interface EngineWorkerHandle<TApi> {
  api: Comlink.Remote<TApi>;
  terminate: () => void;
}

/**
 * Wraps a Worker (or worker-like endpoint) in a typed Comlink proxy plus a
 * single `terminate()` that releases the proxy and tears the worker down.
 * Engine `index.ts` files reach this through `createLazyEngineWorker` below;
 * engine `worker.ts` files pair it with `exposeEngine`.
 */
export function createEngineWorker<TApi>(
  endpoint: TerminatableEndpoint
): EngineWorkerHandle<TApi> {
  const api = Comlink.wrap<TApi>(endpoint);
  return {
    api,
    terminate: () => {
      api[Comlink.releaseProxy]();
      endpoint.terminate?.();
    },
  };
}

/**
 * Called inside a Worker's entry file to expose its processing API to the
 * main thread. Defaults to `self` for real Workers; tests can pass a
 * MessagePort instead.
 */
export function exposeEngine<TApi extends object>(
  api: TApi,
  endpoint: Comlink.Endpoint = self as unknown as Comlink.Endpoint
): void {
  Comlink.expose(api, endpoint);
}

/**
 * Marks a main-thread callback so Comlink passes it to the worker as a
 * callable proxy rather than trying to structured-clone it (which throws for
 * a function). Re-exported here so engine modules never import Comlink
 * directly — `workerClient.ts` stays the one place that knows about it.
 */
export const proxyCallback = Comlink.proxy;

/**
 * Worker-side counterpart to `proxyCallback`: closes the MessagePort Comlink
 * opened for a proxied callback argument. Without this, every RPC that
 * passes a progress callback leaks a port and its listener for the lifetime
 * of the worker. Safe to call with `undefined` (a call that passed none).
 */
export function releaseProxiedCallback(callback: unknown): void {
  if (typeof callback !== "function") return;
  const release = (callback as unknown as Record<symbol, unknown>)[Comlink.releaseProxy];
  if (typeof release === "function") (release as () => void).call(callback);
}

/**
 * Ceiling on how long a single worker RPC may go without any sign of life
 * before it's treated as dead.
 *
 * Chosen from measurement, not taste — timed in a real Chromium against a
 * production build (2026-07-28, PROJECT_LOG.md entry 32), wall-clock from
 * file drop to finished result:
 *
 *   50,000-row / 6.2 MB CSV → table                1.3 s   (Spreadsheet)
 *   50,000-row / 6.2 MB CSV → .xlsx                1.9 s   (Spreadsheet)
 *   250,000-row / 32 MB CSV → .xlsx               14.4 s   (Spreadsheet)
 *   60-page PDF ×2 → 120-page merge               0.08 s   (PDF)
 *   3000×2000 PNG → resize + re-encode            0.22 s   (Image)
 *   8000×6000 PNG → resize + re-encode            0.85 s   (Image)
 *   50,000-feature / 8.6 MB GeoJSON → validate    0.98 s   (Geospatial)
 *   200,000-feature / 36 MB GeoJSON → validate     5.0 s   (Geospatial)
 *
 * 120 s is ~20× the worst case any non-Spreadsheet engine reached on a file
 * far larger than a realistic one, which leaves room for a device several
 * times slower than this one before the ceiling could be reached by
 * legitimate work — the failure mode that would be worse than the stuck
 * spinner this replaces. Spreadsheet's numbers scale superlinearly and put
 * it in a different class, so it overrides this rather than dragging the
 * shared default up to fit (see `engines/spreadsheet/index.ts`). Calls that
 * report progress additionally reset the clock on every report (see
 * `keepAlive`), so "slow but demonstrably alive" is never read as "dead".
 */
export const DEFAULT_RPC_TIMEOUT_MS = 120_000;

export interface LazyEngineWorkerOptions {
  /** Per-call ceiling for this engine. Defaults to `DEFAULT_RPC_TIMEOUT_MS`. */
  timeoutMs?: number;
}

export interface LazyEngineWorker<TApi> {
  /**
   * Runs one RPC against the (lazily spawned) worker under a timeout.
   *
   * `fn` receives the worker API and a `keepAlive()` it can wire to any
   * progress reporting the call produces; each `keepAlive()` restarts the
   * timeout clock. `timeoutMs` overrides this engine's default for one call.
   */
  call<T>(
    fn: (api: TApi, keepAlive: () => void) => Promise<T>,
    timeoutMs?: number
  ): Promise<T>;
  /** Tears the worker down; the next `call` spawns a fresh one. */
  terminate(): void;
}

/**
 * Owns an engine's single lazily-spawned worker: the `new Worker(...)` on
 * first use, the per-call timeout, and respawning after a worker turns out
 * to be dead.
 *
 * The timeout exists because a worker killed by the browser (OOM is the
 * realistic case) doesn't reject anything — it simply stops answering, and
 * a Comlink call to it never settles, leaving the UI on "Processing…"
 * forever with no error and no way out (PRIVACY_ARCHITECTURE.md §6). On
 * timeout the worker is terminated and dropped rather than reused: a dead
 * worker never answers the *next* call either, so keeping it would turn one
 * stuck operation into a permanently broken tool. Concurrent calls sharing
 * that worker each carry their own timer, so they surface the same error
 * instead of hanging.
 */
export function createLazyEngineWorker<TApi>(
  spawn: () => TerminatableEndpoint,
  options: LazyEngineWorkerOptions = {}
): LazyEngineWorker<TApi> {
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;
  let handle: EngineWorkerHandle<TApi> | null = null;

  function currentHandle(): EngineWorkerHandle<TApi> {
    if (!handle) handle = createEngineWorker<TApi>(spawn());
    return handle;
  }

  function discard(dead: EngineWorkerHandle<TApi>): void {
    if (handle === dead) handle = null;
    try {
      dead.terminate();
    } catch {
      // Already gone — nothing left to release.
    }
  }

  function call<T>(
    fn: (api: TApi, keepAlive: () => void) => Promise<T>,
    timeoutMs: number = defaultTimeoutMs
  ): Promise<T> {
    const worker = currentHandle();

    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;

      const arm = () => {
        timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          discard(worker);
          reject(
            new ProcessingError(
              "TIMEOUT",
              `This is taking much longer than expected (over ${Math.round(
                timeoutMs / 1000
              )} seconds), so it was stopped.`
            )
          );
        }, timeoutMs);
      };
      const keepAlive = () => {
        if (settled) return;
        clearTimeout(timer);
        arm();
      };
      arm();

      // `worker.api` is a `Comlink.Remote<TApi>`; every method on it already
      // returns a promise, which is what makes it interchangeable with the
      // plain API type callers write against. TypeScript can't see that
      // through an unresolved generic, hence the one cast, kept here rather
      // than repeated in all four engines.
      fn(worker.api as unknown as TApi, keepAlive).then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (cause: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(cause);
        }
      );
    });
  }

  return {
    call,
    terminate: () => {
      if (handle) discard(handle);
    },
  };
}
