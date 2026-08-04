"use client";

import { useEffect, useRef } from "react";

interface ImageLightboxProps {
  /** The image to show large. `null` closes the dialog. */
  src: string | null;
  alt: string;
  /** Shown under the image — the filename and its size change. */
  caption?: string;
  onClose: () => void;
}

/**
 * Shows a processed image at full size, over the page.
 *
 * The result preview is 320px, which is enough to see *that* an edit happened
 * and not enough to judge a one-percent change to brightness — the thing the
 * finer controls next to it now exist to make. Clicking the preview opens it
 * properly.
 *
 * Built on the native `<dialog>` element and `showModal()` rather than a
 * hand-rolled overlay. That is not a shortcut, it is the accessible option:
 * the browser supplies focus trapping, Escape-to-close, `aria-modal`
 * semantics, inertness of the page behind, and the `::backdrop` — every one of
 * which a div-based modal has to reimplement and usually gets wrong. This
 * project has no modal component precisely because none was needed until now,
 * and adding a half-correct one to a codebase that is careful about ARIA
 * (`Toolbar` is a real tablist, `ActionPicker` a radiogroup) would be a step
 * backwards.
 *
 * `close()` is called imperatively rather than by unmounting, so the browser
 * restores focus to the element that opened it. The `cancel`/`close` events
 * cover Escape and backdrop clicks, which is why `onClose` is wired to the
 * element rather than only to the button.
 */
export function ImageLightbox({ src, alt, caption, onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (src && !dialog.open) dialog.showModal();
    if (!src && dialog.open) dialog.close();
  }, [src]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click landing on the dialog element itself — rather than on its
      // content — is a click on the backdrop, which should dismiss.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      /*
       * `m-auto` is load-bearing, not decoration. A modal `<dialog>` centres
       * itself through the user-agent stylesheet's `margin: auto`, and
       * Tailwind's preflight resets the margin on every element — so without
       * this the dialog pins to the top-left corner of the viewport. It looks
       * broken and nothing catches it: `dialog.open` and `:modal` are both
       * true, so a passing test says the modal works while it is sitting in
       * the corner. Found by taking a screenshot.
       */
      className="m-auto max-h-[90vh] max-w-[95vw] rounded-lg bg-white p-0 backdrop:bg-black/70 dark:bg-gray-900"
    >
      {src && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
            <span className="truncate text-sm text-gray-600 dark:text-gray-300">{caption ?? alt}</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-200 px-3 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
            >
              Close
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[calc(90vh-3rem)] max-w-[95vw] object-contain"
          />
        </div>
      )}
    </dialog>
  );
}
