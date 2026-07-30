"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface FilterableTool {
  id: string;
  name: string;
  description: string;
  href: string;
}

/**
 * Server-rendered initial HTML already contains every tool link (this
 * component receives the full list as a prop and is rendered during SSR
 * like any other client component) — filtering is a pure client-side
 * convenience for categories with many tools (README.txt §27: category
 * pages should "allow search/filter"), not the only way to discover a link.
 */
export function CategoryToolFilter({ tools }: { tools: FilterableTool[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tools;
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(normalized) || tool.description.toLowerCase().includes(normalized)
    );
  }, [tools, query]);

  return (
    <div className="flex flex-col gap-4">
      {tools.length > 6 && (
        <label className="flex flex-col gap-1">
          <span className="sr-only">Filter tools in this category</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tools in this category…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      )}

      {filtered.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="block rounded-lg border border-gray-200 p-4 hover:border-blue-400 dark:border-gray-800"
              >
                <span className="font-medium">{tool.name}</span>
                <p className="text-sm text-gray-500">{tool.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No tools match &quot;{query}&quot; in this category.</p>
      )}
    </div>
  );
}
