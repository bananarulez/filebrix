/**
 * The FileBrix mark: three bricks, two over one.
 *
 * Inline SVG rather than an image file, for three reasons that all matter on
 * this site specifically: it costs no extra request, it stays sharp at any
 * size, and `fill="currentColor"` means it follows the surrounding text into
 * dark mode without a second asset or a `prefers-color-scheme` rule.
 *
 * Deliberately three rectangles and nothing else. The mark has to survive
 * being drawn 16 px wide in a browser tab, where gradients, outlines, thin
 * strokes and small counters all collapse into a grey smudge. Anything
 * "nicer" than this is a logo that only works in the header.
 *
 * The bricks are literal — the product is *FileBrix*, and a stack of blocks
 * says that without repeating the generic document-with-a-folded-corner icon
 * that every competing file tool already uses.
 *
 * `aria-hidden` because it is never the only label: in the header it sits
 * beside the word "FileBrix", so announcing it would just repeat the name.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="1.5" y="4" width="9.5" height="7" rx="1.6" />
      <rect x="13" y="4" width="9.5" height="7" rx="1.6" />
      <rect x="1.5" y="13" width="21" height="7" rx="1.6" />
    </svg>
  );
}
