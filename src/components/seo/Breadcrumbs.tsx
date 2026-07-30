import Link from "next/link";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structuredData";
import { SITE_URL } from "@/lib/seo/metadata";

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path, e.g. "/" or "/pdf-tools". */
  href: string;
}

/** Root-to-leaf trail (e.g. Home → PDF Studio → Merge PDF) rendered as both a visible nav and BreadcrumbList JSON-LD — the two are always in sync since they're built from the same `items`. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true">
                    /
                  </span>
                )}
                {isLast ? (
                  <span aria-current="page" className="text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <StructuredData
        data={buildBreadcrumbJsonLd(
          items.map((item) => ({ name: item.name, url: `${SITE_URL}${item.href === "/" ? "" : item.href}` }))
        )}
      />
    </>
  );
}
