import { AdSlot } from "@/components/tools/AdSlot";

// Pinned to the viewport edges, not computed from the content column.
//
// This used to be `calc(50% ± 28.5rem)`, derived by hand from the old fixed
// `max-w-[54rem]` column — two files silently agreeing on one number, and the
// reason an earlier wide-layout attempt was reverted (PROJECT_LOG.md). The
// column is now fluid (`PageContainer`), so deriving from it is no longer even
// possible; instead `PageContainer` reserves a 12.5rem (200px) gutter on each
// side at `xl` and up, and these sit inside it. The direction of the
// dependency is the point: the container reserves the space, the rails occupy
// it — not the other way round.
//
// 1rem edge offset + 10rem rail = 11rem, inside the container's 12.5rem
// gutter, leaving a 1.5rem (24px) gap to the column. Those two numbers are
// literal in both files because Tailwind needs literal class strings; see
// PageContainer.tsx's note on why they are deliberately not a shared
// exported constant.
//
// Each rail keeps an explicit width (`w-40`, 160px — matching AdSlot's
// "left-rail"/"right-rail" dimensions): a `position: fixed` box with only one
// of left/right set has no other way to know its own width.

/**
 * Reserved space only, matching `AdSlot`'s existing "no fake ads during
 * development" rule (README.txt §37). Shown from `xl` (1280px) up, which is
 * the same breakpoint at which `PageContainer` starts reserving gutter space
 * for them — so a rail can never overlap the content column at any width.
 * Below that, both rails simply don't render and the column uses the full
 * width.
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
      {/*
       * `left-rail` really is on the left and `right-rail` on the right.
       * They were swapped until a 2026 layout review: the "left-rail" slot
       * was rendered with `right: …` and vice versa. Invisible today
       * (`AdSlot` only reserves space — README.txt §37), but a placement
       * name is what an ad network reports and targets on, so it would have
       * silently mislabelled every impression the moment one was wired in.
       * `data-rail` exists so the layout regression test can assert each
       * rail's real position rather than trusting the name.
       */}
      <div
        aria-hidden
        data-rail="left"
        className="pointer-events-none fixed top-1/2 z-30 hidden w-40 -translate-y-1/2 xl:block"
        style={{ left: "1rem" }}
      >
        <AdSlot placement="left-rail" />
      </div>
      <div
        aria-hidden
        data-rail="right"
        className="pointer-events-none fixed top-1/2 z-30 hidden w-40 -translate-y-1/2 xl:block"
        style={{ right: "1rem" }}
      >
        <AdSlot placement="right-rail" />
      </div>
    </>
  );
}
