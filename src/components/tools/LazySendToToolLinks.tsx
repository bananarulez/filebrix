"use client";

import dynamic from "next/dynamic";

/**
 * The single point where the chaining panel — and with it the whole tool
 * registry — enters a client bundle. Same boundary shape as
 * `components/geo/LazyGeoMap.tsx`.
 *
 * This is not premature optimization: `SendToToolLinks` calls
 * `getToolsAcceptingFormat()`, which pulls all 81 `ToolDefinition`s into the
 * client. `ToolPageLayout` is a Server Component, so the registry had never
 * shipped to the browser on a tool page before. Importing the panel
 * statically from `DownloadResult` therefore added ~26 KB gzip to *every*
 * page with a download button, including ones that never render the panel
 * at all (they pass no `sourceToolSlug`) — measured on
 * `/tools/uuid-generator`, 186.2 → 212.8 KB, by the bundle budget check
 * (scripts/check-bundle-budget.mjs) rather than noticed by eye.
 *
 * Behind `next/dynamic` the registry chunk is fetched only when the panel
 * actually renders, i.e. only once a result exists on a tool that opted in.
 * `ssr: false` because it is purely a post-result affordance: there is no
 * result to chain from during SSR, and it keeps the registry out of the
 * prerendered HTML too.
 */
export const LazySendToToolLinks = dynamic(
  () => import("./SendToToolLinks").then((m) => m.SendToToolLinks),
  { ssr: false }
);
