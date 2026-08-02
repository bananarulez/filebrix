import Link from "next/link";
import { getAppNavItems } from "@/registry/navigation";
import { SITE_NAME } from "@/lib/seo/metadata";
import { BrandMark } from "./BrandMark";

/**
 * The primary nav is organized around Applications (Data Studio, PDF
 * Studio, Image Studio, Geospatial Studio, Developer Toolkit), never a flat
 * list of tools — see `registry/navigation.ts`. Each Application is a
 * plain link straight to its own page. An earlier version used a native
 * `<details>`/`<summary>` disclosure per Application to preview its
 * capabilities before clicking through — reverted because multiple
 * disclosures can be open at once with no click-outside-to-close (native
 * `<details>` behavior, not a bug in the styling), which overlapped their
 * panels and cut off text in practice. Capability previews still exist on
 * the homepage's own Applications grid, which doesn't have this problem
 * since it's static content, never a popover. Each link is styled with a
 * visible border/pill shape (not just plain underlined text) specifically
 * so it reads as clickable at a glance.
 */
export function SiteHeader() {
  const appNavItems = getAppNavItems();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <BrandMark className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            {SITE_NAME}
          </Link>
          <span className="text-xs text-gray-400 sm:hidden">No upload · Private</span>
        </div>
        <nav aria-label="Applications" className="flex flex-wrap gap-2 text-sm">
          {appNavItems.map((app) => (
            <Link
              key={app.slug}
              href={app.href}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            >
              {app.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
