"use client";

import { useEffect, useMemo, useState } from "react";
import { COMMON_CRS, searchCrs, searchAllCrs, findCrs, type CrsDefinition } from "@/engines/geospatial";

/**
 * A searchable CRS selector covering the **full EPSG catalogue** (8,000+
 * systems), not just the common ones.
 *
 * Two layers, deliberately:
 * - The curated list (`searchCrs`) is in the main bundle and answers
 *   synchronously, so the quick-select buttons and the first keystrokes are
 *   instant with nothing downloaded.
 * - `searchAllCrs` lazy-loads the generated full index (~140 KB gzipped) on
 *   the first real query and searches that, merging curated entries first so
 *   a common CRS keeps its friendlier aliases.
 *
 * A raw proj4/WKT string is still accepted for anything even EPSG doesn't
 * cover.
 */
export function CrsPicker({
  id,
  label,
  value,
  onChange,
  detectedNote,
}: {
  id: string;
  label: string;
  /** Either a registry code ("EPSG:4326") or a raw proj4/WKT string. */
  value: string;
  onChange: (value: string) => void;
  /** Optional note rendered under the label, e.g. an auto-detection result. */
  detectedNote?: string;
}) {
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  /** Full-catalogue results, tagged with the query they answer. */
  const [fullResults, setFullResults] = useState<{ query: string; results: CrsDefinition[] } | null>(null);

  // Instant, synchronous results from the curated list.
  const quickMatches = useMemo(() => searchCrs(query, 12), [query]);

  /**
   * Derived rather than stored: show the full-catalogue results once they've
   * arrived *for this exact query*, and the instant curated hits until then.
   * Keeping this a derivation (instead of syncing state in the effect) means
   * the list can never blank out mid-search, and satisfies
   * `react-hooks/set-state-in-effect`.
   */
  const trimmedQuery = query.trim();
  const matches = fullResults?.query === trimmedQuery ? fullResults.results : quickMatches;
  const isSearching = trimmedQuery !== "" && fullResults?.query !== trimmedQuery;

  useEffect(() => {
    if (!trimmedQuery) return;
    let cancelled = false;

    // Debounced: the catalogue is big enough that a scan per keystroke is
    // wasted work nobody sees.
    const timer = setTimeout(() => {
      searchAllCrs(trimmedQuery, 60)
        .then((results) => {
          if (!cancelled) setFullResults({ query: trimmedQuery, results });
        })
        .catch(() => {
          // Leaving the curated hits on screen is a fine outcome — the picker
          // stays usable even if the full index fails to load.
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  const selectedFromMatches = matches.find((crs) => crs.code === value);
  const selected = findCrs(value) ?? selectedFromMatches ?? null;
  const isCustom = value.trim() !== "" && !selected && !value.toUpperCase().startsWith("EPSG:");

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
      <legend className="px-1 font-medium">{label}</legend>

      {detectedNote && <p className="text-xs text-blue-700 dark:text-blue-300">{detectedNote}</p>}

      <div className="flex flex-wrap gap-1.5">
        {COMMON_CRS.map((crs) => (
          <button
            key={crs.code}
            type="button"
            onClick={() => {
              onChange(crs.code);
              setShowCustom(false);
            }}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              value === crs.code
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
            }`}
            title={crs.name}
          >
            {crs.code}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">
          Search all {(8000).toLocaleString()}+ EPSG systems by code, name or alias
        </span>
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. 27700, Krovak, British National Grid, Lambert"
          className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <select
        id={id}
        aria-label={label}
        value={selected?.code ?? ""}
        onChange={(event) => {
          onChange(event.target.value);
          setShowCustom(false);
        }}
        size={Math.min(Math.max(matches.length, 3), 8)}
        className="rounded-md border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
      >
        {matches.map((crs) => (
          <option key={crs.code} value={crs.code}>
            {crs.code} — {crs.name}
          </option>
        ))}
        {matches.length === 0 && (
          <option disabled>No match — try a different term, or paste a definition below.</option>
        )}
      </select>

      <p className="text-xs text-gray-500">
        {isSearching
          ? "Searching the full EPSG catalogue…"
          : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
      </p>

      <button
        type="button"
        onClick={() => setShowCustom((previous) => !previous)}
        className="w-fit text-xs text-blue-700 underline dark:text-blue-300"
      >
        {showCustom || isCustom ? "Hide custom definition" : "Use a custom proj4 / WKT definition"}
      </button>

      {(showCustom || isCustom) && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">
            Paste a proj4 or WKT string for any CRS not in the EPSG catalogue
          </span>
          <textarea
            value={isCustom ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs"
            className="rounded-md border border-gray-300 p-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      )}

      <p className="text-xs text-gray-500">
        Selected:{" "}
        <span className="font-medium">
          {selected ? `${selected.code} — ${selected.name}` : isCustom ? "Custom definition" : value || "none"}
        </span>
      </p>
    </fieldset>
  );
}
