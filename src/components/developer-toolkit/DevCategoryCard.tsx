import Link from "next/link";
import type { DevCategorySlug } from "@/registry/types";
import { DevCategoryIcon } from "./DevCategoryIcon";

interface DevCategoryCardProps {
  slug: DevCategorySlug;
  name: string;
  description: string;
  /** Every tool in this category, in registry order. Rendered in full — see the comment below. */
  tools: { id: string; name: string; href: string }[];
}

export function DevCategoryCard({ slug, name, description, tools }: DevCategoryCardProps) {
  return (
    <div
      // Test hook, same idea as PageContainer's data-content-column: two
      // categories can legitimately hold the same number of tools, so a test
      // looking for "3 tools" on the page matches more than one card. Scoping
      // by category is the assertion people actually mean.
      data-dev-category={slug}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-5 dark:border-gray-800"
    >
      <DevCategoryIcon slug={slug} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>

      {/* The whole list, not a truncated preview with "+7 more".
          This card used to show a bare count, so the hub named none of the
          25 tools it leads to — a visitor couldn't tell whether the thing
          they wanted was here without opening four pages, and the hub had no
          internal link to any tool. The lists are short enough (2–12) that
          showing them all beats making the page guess which ones matter. */}
      <ul className="flex flex-wrap gap-1.5">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link
              href={tool.href}
              className="inline-block rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:border-blue-500 hover:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:text-blue-400"
            >
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {tools.length} {tools.length === 1 ? "tool" : "tools"}
        </span>
        <Link
          href={`/developer-tools/${slug}`}
          aria-label={`Open ${name}`}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
