"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the whole application usable with
 * no network connection (PROJECT_LOG.md entry 37).
 *
 * Renders nothing. Lives in the root layout so every route is covered by the
 * same registration, and runs in an effect so it never executes during SSR.
 *
 * **The update strategy is the load-bearing part.** A stale cached shell
 * serving an old build is worse than no offline support, so freshness wins
 * over stability at every step:
 *  - `sw.js` embeds a build id derived from the precache list, so the browser
 *    byte-compares a genuinely different script whenever any asset changes.
 *  - The worker calls `skipWaiting()` on install and `clients.claim()` on
 *    activate, so a new build takes over without waiting for every tab to
 *    close.
 *  - This component reloads the page once when control changes, so a document
 *    from the old build never keeps running against the new build's chunks.
 *
 * The `refreshing` guard matters: without it, `controllerchange` → reload →
 * (new controller) → reload is a loop. It is module-scoped rather than a ref
 * because the reload tears the component down entirely.
 */
let refreshing = false;

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // A worker registered by `next dev` would cache dev-server output and then
    // serve it after a rebuild, which looks exactly like "my change didn't
    // apply". Production builds only.
    if (process.env.NODE_ENV !== "production") return;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Registration failure is deliberately non-fatal and silent: every tool
    // works without a service worker: offline support is an enhancement, not
    // a dependency, and an error banner would be noise for a user whose
    // browser or privacy settings simply disallow workers.
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
