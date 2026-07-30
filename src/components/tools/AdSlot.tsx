export type AdSlotPlacement = "below-tool" | "after-result" | "category-page" | "left-rail" | "right-rail";

const DIMENSIONS: Record<AdSlotPlacement, { width: number; height: number }> = {
  "below-tool": { width: 728, height: 90 },
  "after-result": { width: 300, height: 250 },
  "category-page": { width: 728, height: 90 },
  // 160x600 "wide skyscraper" — the widest standard IAB unit that still fits
  // beside the 768px content column with room to spare down to a 1280px
  // viewport (measured empirically; a 300px-wide unit doesn't fit until
  // ~1440px). See SideRailAds.tsx, the one consumer of these two placements.
  "left-rail": { width: 160, height: 600 },
  "right-rail": { width: 160, height: 600 },
};

/**
 * Reserved space only — no ad network is wired in yet (README.txt §37: don't
 * add fake advertising during development, just the placement architecture).
 * Fixed dimensions prevent layout shift once a real network is integrated.
 */
export function AdSlot({ placement }: { placement: AdSlotPlacement }) {
  const { width, height } = DIMENSIONS[placement];
  return (
    <div
      aria-hidden
      style={{ minHeight: height, maxWidth: width }}
      className="mx-auto flex w-full items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-300 dark:border-gray-800 dark:text-gray-700"
    />
  );
}
