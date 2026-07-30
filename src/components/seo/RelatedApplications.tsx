import Link from "next/link";
import { getAppNavItems } from "@/registry/navigation";

/**
 * Cross-links the other Applications from an Application or capability
 * page — the app-level counterpart to `RelatedTools`, and the piece that
 * turns the site's internal link graph from a set of disconnected
 * per-Application trees into a connected one (previously the only path
 * between two Applications was via the header nav or the homepage).
 *
 * `excludeSlug` drops the page's own Application, so a page never links to
 * itself. Reads `getAppNavItems()` — the same single source the header,
 * footer and homepage grid use (rule 8), so a new Application appears here
 * automatically.
 */
export function RelatedApplications({ excludeSlug }: { excludeSlug?: string }) {
  const others = getAppNavItems().filter((app) => app.slug !== excludeSlug);
  if (others.length === 0) return null;

  return (
    <nav aria-label="Related applications" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-500">Related applications</h2>
      <ul className="flex flex-wrap gap-2">
        {others.map((app) => (
          <li key={app.slug}>
            <Link
              href={app.href}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-blue-400 hover:text-blue-600 dark:border-gray-700"
            >
              {app.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
