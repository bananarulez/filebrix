import { AdSlot } from "@/components/tools/AdSlot";

// Every page's content column is `mx-auto max-w-[54rem]` (864px) — see
// page.tsx/ToolPageLayout.tsx/CategoryPage.tsx, kept consistent deliberately
// so this can position against a single known column width instead of
// measuring it. `right`/`left` are computed from viewport center (50%) so
// each rail's inner edge sits `GAP_REM` outside the content column. Each
// rail is given an explicit width (`w-40` below, 10rem/160px — matches
// AdSlot's "left-rail"/"right-rail" dimensions) rather than left as
// shrink-to-fit, since a `position: fixed` box with only one of left/right
// set has no other way to know its own width.
//
// 54rem leaves 24px of slack on each side at the 1280px (`xl`) breakpoint
// below — chosen deliberately over a wider column so the rails still fit
// (and ads still show) at 1366x768, the single most common laptop
// resolution, rather than only on larger screens.
const CONTENT_HALF_WIDTH_REM = 27; // max-w-[54rem] / 2
const GAP_REM = 1.5;

const railOffset = `calc(50% + ${CONTENT_HALF_WIDTH_REM + GAP_REM}rem)`;

/**
 * Reserved space only, matching `AdSlot`'s existing "no fake ads during
 * development" rule (README.txt §37). Only shown once there's genuinely
 * enough room beside the content column for a 160x600 unit without crowding
 * it — measured empirically at ~1280px viewport width, which is Tailwind's
 * `xl` breakpoint. Below that, both rails simply don't render.
 *
 * Fixed (not absolute/sticky) so the ad stays put while the page scrolls,
 * standard for this kind of side-rail placement — and because it's
 * positioned relative to the viewport, not any particular page's markup,
 * one instance in the root layout covers every page without each page
 * needing to know about it.
 */
export function SideRailAds() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/2 z-30 hidden w-40 -translate-y-1/2 xl:block"
        style={{ right: railOffset }}
      >
        <AdSlot placement="left-rail" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/2 z-30 hidden w-40 -translate-y-1/2 xl:block"
        style={{ left: railOffset }}
      >
        <AdSlot placement="right-rail" />
      </div>
    </>
  );
}
