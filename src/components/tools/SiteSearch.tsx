"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { searchSite } from "@/registry/search";
import { getToolUrl } from "@/registry";

/**
 * The site's one global search box — Applications, their capabilities and
 * accepted file formats, and individual tools (`registry/search.ts#searchSite`),
 * entirely client-side. Applications render first and are visually
 * distinguished (bold, with an "Application" tag) from tool results below
 * them, making the apps-before-tools ranking legible, not just structural.
 */
export function SiteSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? searchSite(query) : []), [query]);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="site-search" className="text-lg font-medium">
        What do you want to do?
      </label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="convert csv to excel, merge pdf, view geojson…"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
      />
      {query.trim() &&
        (results.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {results.map((result) =>
              result.kind === "application" ? (
                <li key={`app-${result.slug}`}>
                  <Link
                    href={result.href}
                    className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {result.name}
                  </Link>
                  <span className="ml-2 rounded-full border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-600 dark:border-blue-900 dark:text-blue-400">
                    Application
                  </span>
                </li>
              ) : (
                <li key={result.tool.id}>
                  <Link
                    href={getToolUrl(result.tool)}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {result.tool.name}
                  </Link>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No matches for &quot;{query.trim()}&quot; — try a different search term, or browse by
            application below.
          </p>
        ))}
    </div>
  );
}
