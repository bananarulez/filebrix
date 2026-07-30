"use client";

import { useEffect, useRef, useState } from "react";

interface PdfThumbnailProps {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  render: () => Promise<string>;
  /** Rendered thumbnails are cached by the parent (see PdfPageWorkspaceTool)
   * so a `rotation` change forces a fresh render even though `render`'s
   * identity may not have changed. */
  cacheKey: string;
}

const THUMBNAIL_WIDTH_PX = 140;

/**
 * Renders a single page thumbnail only once it's scrolled near-visible —
 * required for large PDFs, where rendering every page up front would be
 * slow and memory-heavy. The placeholder box is sized to the page's real
 * aspect ratio so mixed page sizes never cause a layout jump once the
 * image loads in.
 */
export function PdfThumbnail({ pageNumber, width, height, rotation, render, cacheKey }: PdfThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    // Deliberately doesn't reset dataUrl/failed synchronously here — when
    // cacheKey changes (e.g. after a rotation), the previous thumbnail
    // stays visible until the new one resolves, rather than flashing back
    // to a "Rendering…" placeholder.
    (async () => {
      try {
        const url = await render();
        if (!cancelled) {
          setDataUrl(url);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, cacheKey]);

  const rotated = rotation === 90 || rotation === 270;
  const aspectWidth = rotated ? height : width;
  const aspectHeight = rotated ? width : height;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-1"
      style={{ width: THUMBNAIL_WIDTH_PX }}
    >
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        style={{ aspectRatio: `${aspectWidth} / ${aspectHeight}` }}
      >
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`Page ${pageNumber}`} className="h-full w-full object-contain" />
        )}
        {!dataUrl && !failed && isVisible && (
          <span className="text-xs text-gray-400" role="status">
            Rendering…
          </span>
        )}
        {failed && (
          <span className="px-1 text-center text-xs text-red-500">Couldn&apos;t render</span>
        )}
      </div>
      <span className="text-xs text-gray-500">Page {pageNumber}</span>
    </div>
  );
}
