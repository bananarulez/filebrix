import type { ReactNode } from "react";

/**
 * The two page widths this site has, in one place.
 *
 * Before this, every page hardcoded `mx-auto max-w-[54rem]` (864px) and
 * `SideRailAds` separately hardcoded half of that number to position itself.
 * Two files had to agree on one measurement by hand, which is exactly why an
 * earlier attempt at a wide layout was reverted — see PROJECT_LOG.md.
 *
 * **Why the wide container is padded rather than simply capped.** The side
 * rails are two 160×600 slots that must keep their margins (monetization is
 * display ads — README.txt §37). At `xl` and up the wrapper reserves
 * `RAIL_GUTTER_REM` on each side for them and the inner column takes whatever
 * is left, up to `CONTENT_MAX_PX`. So the column is effectively
 * `min(1520px, 100vw − 2 × gutter)`:
 *
 *   1920px viewport → 1520px column (was 864px)
 *   1600px          → 1200px
 *   1366px          →  966px
 *   below xl        → no rails exist, so the full width minus normal padding
 *
 * The honest limitation: between 1280px and ~1450px the rails cost 400px, so
 * the gain over the old fixed column is modest. That is inherent to keeping
 * both — the only way to get a full-bleed 1800px column is to drop the rails.
 *
 * **The one invariant to preserve if you change a number here:** the `xl`
 * gutter (12.5rem = 200px) must stay ≥ the rail's own width (160px) plus its
 * viewport-edge offset (16px) plus a visible gap, or a rail will sit on top of
 * the content column. Tailwind needs literal class strings, so that number
 * can't be a shared imported constant — an earlier revision exported
 * `RAIL_GUTTER_REM`/`CONTENT_MAX_PX`/`PROSE_MAX_REM` for that purpose and
 * nothing ever imported them, which is worse than an honest comment because it
 * *looks* like a single source of truth. The two files that must agree are
 * this one and `SideRailAds.tsx`, and both say so.
 */

/**
 * Wide application container — Studios, tool pages, index pages, the homepage.
 * Tables, maps, grids and previews inside it grow to fill the space.
 */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full px-4 md:px-6 lg:px-8 xl:px-[12.5rem]">
      {/* `data-content-column` marks the actual column for the layout
          regression test (tests/e2e/layout.spec.ts), which asserts the ad
          rails never overlap it. Measuring it by DOM-walking up from the h1
          was ambiguous — page shells nest their headers at different depths,
          so the walk landed on the full-width padded wrapper on some pages
          and the real column on others. */}
      <div data-content-column className={`mx-auto flex w-full max-w-[1520px] flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Narrow reading container, for text that is read rather than operated:
 * FAQ blocks, how-it-works steps, the 404 page. Nested inside a
 * `PageContainer` on pages that are otherwise wide — a wide page can still
 * have a narrow prose section, and should.
 */
export function ProseContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`w-full max-w-[54rem] ${className}`}>{children}</div>;
}
