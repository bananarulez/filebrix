import Link from "next/link";
import { getAppNavItems } from "@/registry/navigation";
import { SITE_CONFIG } from "@/config/site";
import { SITE_NAME } from "@/lib/seo/metadata";

/**
 * Two rows, deliberately:
 *
 * - **Products** — the 5 Applications, from the same `getAppNavItems()` the
 *   header and homepage grid use, so a new Application appears here
 *   automatically. This is real internal linking and earns its place.
 * - **Company & legal** — About, Contact, Privacy, Terms. Small and fixed.
 *
 * Kept to those two rows on purpose. Footer link bloat dilutes internal
 * linking, and the pages a "complete" SaaS footer usually lists (Status,
 * API, Careers, Community) would each advertise something this project
 * doesn't have — there is no backend to be down, no API to call, and no team
 * to join. An empty page behind a confident link costs more trust than a
 * missing link does.
 *
 * The operator line is the one genuinely new trust signal: a tool that asks
 * you to open documents in it should say who is behind it.
 */
export function SiteFooter() {
  const appNavItems = getAppNavItems();
  const { operator, links } = SITE_CONFIG;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
        <nav aria-label="Applications" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {appNavItems.map((app) => (
            <Link key={app.slug} href={app.href} className="hover:text-gray-900 dark:hover:text-white">
              {app.name}
            </Link>
          ))}
        </nav>

        <nav aria-label="Company and legal" className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/about" className="hover:text-gray-900 dark:hover:text-white">
            About
          </Link>
          <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">
            Terms
          </Link>
          {links.github && (
            <a
              href={links.github}
              className="hover:text-gray-900 dark:hover:text-white"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          )}
        </nav>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Your files are processed locally in your browser and are never uploaded.
        </p>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          © {year} {operator.legalName ?? operator.name} · {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
