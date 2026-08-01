import type { Metadata } from "next";
import Link from "next/link";
import type { AppMode } from "@/registry/types";
import type { StudioCategorySlug } from "@/registry/studios";
import { getCapabilityConfig, getCapabilitiesForStudio } from "@/registry/capabilities";
import { getToolUrl } from "@/registry";
import { buildCategoryMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildItemListJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedApplications } from "@/components/seo/RelatedApplications";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { AdSlot } from "@/components/tools/AdSlot";
import { PageContainer, ProseContainer } from "@/components/layout/PageContainer";

/** `<title>`/`<meta description>`/canonical for one capability index page, all from registry data. */
export function capabilityMetadata(categorySlug: StudioCategorySlug, capability: AppMode): Metadata {
  const config = getCapabilityConfig(categorySlug, capability);
  return buildCategoryMetadata(
    `${config.label} — ${config.appName} — Free, Private & No Upload`,
    config.description,
    config.path
  );
}

/**
 * One Application capability's index page (`/{categorySlug}/{capability}`,
 * e.g. `/pdf-studio/pages`) — the middle layer of the site's URL hierarchy
 * that previously didn't exist at all: Home → Application → **Capability**
 * → Tool. Before this, a Studio's capabilities were client-side tabs with
 * no URL, so the only crawlable path to a tool was the Application page's
 * flat "related actions" list.
 *
 * Deliberately a *list*, never a second copy of the Studio app — that's
 * what keeps it from being duplicate content against the Application page
 * it sits under. It enumerates only the tools in this capability, each
 * with its own registry description, plus a link into the Application
 * itself and cross-links to the other Applications.
 */
export function CapabilityPageContent({
  categorySlug,
  capability,
}: {
  categorySlug: StudioCategorySlug;
  capability: AppMode;
}) {
  const config = getCapabilityConfig(categorySlug, capability);
  const siblings = getCapabilitiesForStudio(categorySlug).filter((c) => c.id !== capability);

  return (
    <PageContainer className="gap-8 py-16">
      <StructuredData
        data={buildItemListJsonLd(
          `${config.label} — ${config.appName}`,
          config.description,
          `${SITE_URL}${config.path}`,
          config.tools.map((tool) => ({ name: tool.name, url: `${SITE_URL}${getToolUrl(tool)}` }))
        )}
      />

      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: config.appName, href: `/${categorySlug}` },
            { name: config.label, href: config.path },
          ]}
        />
        <header className="flex flex-col gap-3">
          <LocalProcessingBadge />
          <h1 className="text-3xl font-semibold">
            {config.label} — {config.appName}
          </h1>
          <ProseContainer>
            <p className="text-gray-600 dark:text-gray-300">{config.description}</p>
          </ProseContainer>
        </header>
      </div>

      <ul className="flex flex-col gap-3">
        {config.tools.map((tool) => (
          <li key={tool.id}>
            <Link
              href={getToolUrl(tool)}
              className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 hover:border-blue-400 dark:border-gray-800"
            >
              <span className="font-medium text-blue-700 dark:text-blue-400">{tool.name}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{tool.description}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Prefer to work in one place?{" "}
        <Link href={`/${categorySlug}`} className="text-blue-600 hover:underline dark:text-blue-400">
          Open {config.appName}
        </Link>{" "}
        to use {config.label.toLowerCase()} alongside every other {config.appName} capability, without
        re-selecting your file.
      </p>

      <AdSlot placement="category-page" />

      {siblings.length > 0 && (
        <nav aria-label={`More in ${config.appName}`} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-500">More in {config.appName}</h2>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={sibling.path}
                  className="rounded-full border border-gray-200 px-3 py-1 text-sm hover:border-blue-400 hover:text-blue-600 dark:border-gray-700"
                >
                  {sibling.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <RelatedApplications excludeSlug={categorySlug} />
    </PageContainer>
  );
}
