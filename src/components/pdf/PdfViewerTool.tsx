"use client";

import { useEffect, useMemo, useState } from "react";
import { usePdfWorkspace } from "./PdfWorkspace";

/** Every page containing the query, with how many times it appears there. */
interface PageMatch {
  pageIndex: number;
  count: number;
}

function findMatches(pageTexts: string[], query: string): PageMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  const matches: PageMatch[] = [];
  pageTexts.forEach((text, pageIndex) => {
    const haystack = text.toLowerCase();
    let count = 0;
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      count += 1;
      from = at + needle.length;
    }
    if (count > 0) matches.push({ pageIndex, count });
  });
  return matches;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_STEP = 25;
/** Render width, in CSS pixels, at 100% zoom — a comfortable reading width inside the 864px content column. */
const BASE_WIDTH_PX = 760;

/**
 * PDF Studio's View tab: read a PDF page by page, at a readable size, with
 * no processing and nothing to download.
 *
 * Renders exactly one page at a time through the workspace's shared pdf.js
 * session (`renderThumbnail` is just "render this page at most this wide" —
 * the Pages tab asks it for 140px, this asks for ~760px). One page at a
 * time, re-rendered on zoom, is what keeps a 500-page document as cheap to
 * open here as anywhere else in the Studio; a continuously scrolling,
 * all-pages canvas would need its own virtualization to match that, which
 * the Pages tab's thumbnail grid already covers for whole-document
 * overview.
 */
export function PdfViewerTool() {
  const { documents } = usePdfWorkspace();
  const doc = documents[0] ?? null;
  const pageCount = doc?.info.pageCount ?? 0;

  const [pageIndex, setPageIndex] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState("");
  const [pageTexts, setPageTexts] = useState<string[] | null>(null);
  const [textFailed, setTextFailed] = useState(false);
  const [matchCursor, setMatchCursor] = useState(0);

  const session = doc?.session ?? null;
  const renderWidth = Math.round((BASE_WIDTH_PX * zoomPct) / 100);

  /**
   * Text is extracted once, lazily — only after the user actually types a
   * query. Opening the viewer to read a document shouldn't pay for a
   * whole-document text pass it may never use, and the same
   * `session.extractText()` the PDF-to-Text tab uses gives per-page strings,
   * so search needed no new engine capability at all.
   */
  const wantsText = query.trim() !== "";
  useEffect(() => {
    if (!session || !wantsText || pageTexts || textFailed) return;
    let cancelled = false;
    session
      .extractText()
      .then((extraction) => {
        if (!cancelled) setPageTexts(extraction.pages);
      })
      .catch(() => {
        if (!cancelled) setTextFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session, wantsText, pageTexts, textFailed]);

  const matches = useMemo(() => (pageTexts ? findMatches(pageTexts, query) : []), [pageTexts, query]);
  const totalMatches = matches.reduce((sum, match) => sum + match.count, 0);
  const isSearching = wantsText && !pageTexts && !textFailed;

  /** Jumps the viewer to the nth matching page, wrapping at both ends. */
  function goToMatch(step: 1 | -1) {
    if (matches.length === 0) return;
    const next = (matchCursor + step + matches.length) % matches.length;
    setMatchCursor(next);
    setPageIndex(matches[next]!.pageIndex);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setMatchCursor(0);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    session
      .renderThumbnail(pageIndex, renderWidth)
      // Deliberately doesn't clear `dataUrl` first: the previous page stays
      // on screen until the next one is ready, so paging through a document
      // doesn't flash an empty box on every step. Both flags are set in the
      // callbacks rather than reset up front, so the effect body itself
      // never calls setState (`react-hooks/set-state-in-effect`).
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session, pageIndex, renderWidth]);

  if (!doc) return null;

  const page = doc.info.pages[pageIndex];
  const rotated = page ? page.rotation === 90 || page.rotation === 270 : false;
  const aspectWidth = page ? (rotated ? page.height : page.width) : 1;
  const aspectHeight = page ? (rotated ? page.width : page.height) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
            disabled={pageIndex === 0}
            className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
          >
            Previous page
          </button>
          <button
            type="button"
            onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
            disabled={pageIndex >= pageCount - 1}
            className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
          >
            Next page
          </button>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-gray-500">Page</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={pageIndex + 1}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              setPageIndex(Math.min(Math.max(Math.round(next) - 1, 0), pageCount - 1));
            }}
            aria-label="Page number"
            className="w-20 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
          />
          <span className="text-gray-500">of {pageCount}</span>
        </label>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomPct((zoom) => Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
            disabled={zoomPct <= ZOOM_MIN}
            className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="w-12 text-center tabular-nums">{zoomPct}%</span>
          <button
            type="button"
            onClick={() => setZoomPct((zoom) => Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
            disabled={zoomPct >= ZOOM_MAX}
            className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-gray-500">Find</span>
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search this PDF…"
            aria-label="Search this PDF"
            className="w-56 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        {isSearching && (
          <span role="status" className="text-gray-500">
            Reading text…
          </span>
        )}
        {textFailed && <span className="text-red-500">Couldn&apos;t read this PDF&apos;s text</span>}
        {wantsText && pageTexts && (
          <>
            <span className="text-gray-500" role="status">
              {totalMatches === 0
                ? "No matches"
                : `${totalMatches} ${totalMatches === 1 ? "match" : "matches"} on ${matches.length} ${
                    matches.length === 1 ? "page" : "pages"
                  }`}
            </span>
            {matches.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToMatch(-1)}
                  className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700"
                >
                  Previous match
                </button>
                <button
                  type="button"
                  onClick={() => goToMatch(1)}
                  className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700"
                >
                  Next match
                </button>
                <span className="text-xs text-gray-500">
                  page {matches[matchCursor]!.pageIndex + 1}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Page-level search, deliberately: highlighting each hit in place would
          need pdf.js's text layer positioned over the rendered image, which is
          a much larger feature than reusing the extraction this app already
          does. Finding the right page is the part that's actually hard by hand. */}
      {wantsText && pageTexts && totalMatches > 0 && (
        <p className="text-xs text-gray-500">
          Search jumps to pages containing your text; matches aren&rsquo;t highlighted on the page itself.
        </p>
      )}

      <div className="max-h-[40rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
        <div
          className="mx-auto flex items-center justify-center bg-white dark:bg-gray-950"
          style={{ width: renderWidth, maxWidth: "100%", aspectRatio: `${aspectWidth} / ${aspectHeight}` }}
        >
          {dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from pdf.js, not a static asset
            <img
              src={dataUrl}
              alt={`Page ${pageIndex + 1} of ${pageCount}`}
              className="h-full w-full object-contain"
            />
          )}
          {!dataUrl && !failed && (
            <span className="text-xs text-gray-400" role="status">
              Rendering…
            </span>
          )}
          {failed && <span className="px-2 text-center text-xs text-red-500">Couldn&apos;t render this page</span>}
        </div>
      </div>
    </div>
  );
}
