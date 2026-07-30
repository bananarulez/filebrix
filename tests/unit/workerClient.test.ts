import { describe, expect, it, vi } from "vitest";
import * as Comlink from "comlink";
import {
  createEngineWorker,
  createLazyEngineWorker,
  exposeEngine,
  proxyCallback,
  releaseProxiedCallback,
} from "@/engines/shared/workerClient";
import { ProcessingError } from "@/lib/errors/ProcessingError";

interface DemoApi {
  double(n: number): number;
}

describe("createEngineWorker / exposeEngine", () => {
  it("proxies calls across a postMessage-like endpoint and can terminate", async () => {
    // MessagePort satisfies Comlink's Endpoint interface just like a real
    // Worker would, so this proves the worker <-> main-thread wiring works
    // end-to-end without needing an actual bundled Worker in the test env.
    const { port1, port2 } = new MessageChannel();
    port1.start();
    port2.start();

    exposeEngine<DemoApi>({ double: (n) => n * 2 }, port1 as unknown as Comlink.Endpoint);
    const handle = createEngineWorker<DemoApi>(port2 as unknown as Comlink.Endpoint);

    await expect(handle.api.double(21)).resolves.toBe(42);

    expect(() => handle.terminate()).not.toThrow();
  });
});

interface HangingApi {
  hang(): Promise<never>;
}

/**
 * A worker-shaped endpoint whose api never answers — the shape a browser
 * leaves behind when it kills a worker for OOM: no error event, no
 * rejection, just silence. Real timers throughout (with a deliberately tiny
 * per-call timeout override), since a mocked clock would only prove the
 * branch exists, not that a hung RPC actually surfaces as an error.
 */
function silentEndpoint() {
  const { port1, port2 } = new MessageChannel();
  port1.start();
  port2.start();
  exposeEngine<HangingApi>(
    { hang: () => new Promise<never>(() => {}) },
    port1 as unknown as Comlink.Endpoint
  );
  const terminate = vi.fn(() => {
    port1.close();
    port2.close();
  });
  return Object.assign(port2 as unknown as Comlink.Endpoint, { terminate });
}

describe("createLazyEngineWorker — RPC timeout", () => {
  it("rejects with a TIMEOUT ProcessingError when a call never answers", async () => {
    const worker = createLazyEngineWorker<HangingApi>(silentEndpoint, { timeoutMs: 40 });

    const failure = await worker.call((api) => api.hang()).catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ProcessingError);
    expect((failure as ProcessingError).code).toBe("TIMEOUT");
    // Surfaced verbatim by ErrorPanel, so it has to read as an explanation.
    expect((failure as ProcessingError).message).toMatch(/longer than expected/i);
  });

  it("tears the dead worker down and spawns a fresh one for the next call", async () => {
    const spawned: ReturnType<typeof silentEndpoint>[] = [];
    const spawn = () => {
      const endpoint = silentEndpoint();
      spawned.push(endpoint);
      return endpoint;
    };
    const worker = createLazyEngineWorker<HangingApi>(spawn, { timeoutMs: 40 });

    await expect(worker.call((api) => api.hang())).rejects.toBeInstanceOf(ProcessingError);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.terminate).toHaveBeenCalled();

    // Without the respawn, the next call would queue behind a worker that is
    // never going to answer — one stuck operation would break the tool for
    // the rest of the session.
    await expect(worker.call((api) => api.hang())).rejects.toBeInstanceOf(ProcessingError);
    expect(spawned).toHaveLength(2);
  });

  it("keeps a slow-but-reporting call alive past the ceiling via keepAlive", async () => {
    const worker = createLazyEngineWorker<HangingApi>(silentEndpoint, { timeoutMs: 60 });

    const result = await worker.call(async (_api, keepAlive) => {
      // ~150ms of work, well past the 60ms ceiling, but reporting throughout.
      for (let i = 0; i < 5; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        keepAlive();
      }
      return "finished";
    });

    expect(result).toBe("finished");
  });

  it("leaves a normal call untouched — no timeout, no respawn", async () => {
    const spawn = vi.fn(() => {
      const { port1, port2 } = new MessageChannel();
      port1.start();
      port2.start();
      exposeEngine<DemoApi>({ double: (n) => n * 2 }, port1 as unknown as Comlink.Endpoint);
      return port2 as unknown as Comlink.Endpoint;
    });
    const worker = createLazyEngineWorker<DemoApi>(spawn, { timeoutMs: 5_000 });

    // `DemoApi` declares a synchronous `double`; across the real boundary
    // every call is a promise, which is what `async` here stands in for.
    await expect(worker.call(async (api) => api.double(21))).resolves.toBe(42);
    await expect(worker.call(async (api) => api.double(1))).resolves.toBe(2);
    // One worker, spawned once and reused — the pre-existing behaviour.
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});

describe("proxyCallback / releaseProxiedCallback", () => {
  it("lets the worker side call back into a main-thread function, then release it", async () => {
    interface ReportingApi {
      run(onProgress: (n: number) => void): Promise<string>;
    }
    const { port1, port2 } = new MessageChannel();
    port1.start();
    port2.start();

    exposeEngine<ReportingApi>(
      {
        async run(onProgress) {
          onProgress(1);
          onProgress(2);
          releaseProxiedCallback(onProgress);
          return "done";
        },
      },
      port1 as unknown as Comlink.Endpoint
    );

    const worker = createLazyEngineWorker<ReportingApi>(() => port2 as unknown as Comlink.Endpoint);
    const seen: number[] = [];

    await expect(
      worker.call((api) => api.run(proxyCallback((n: number) => seen.push(n))))
    ).resolves.toBe("done");

    // The reports cross the boundary asynchronously, so they can land just
    // after the call itself resolves.
    await vi.waitFor(() => expect(seen).toEqual([1, 2]));
  });

  it("is a no-op for a call that passed no callback", () => {
    expect(() => releaseProxiedCallback(undefined)).not.toThrow();
  });
});
