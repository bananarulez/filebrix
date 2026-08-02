import type { Metadata } from "next";
import Link from "next/link";
import { SiteSearch } from "@/components/tools/SiteSearch";
import { UniversalFileDrop } from "@/components/tools/UniversalFileDrop";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { AdSlot } from "@/components/tools/AdSlot";
import { StructuredData } from "@/components/seo/StructuredData";
import { getAppNavItems } from "@/registry/navigation";
import { buildHomeMetadata, SITE_NAME, SITE_URL } from "@/lib/seo/metadata";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structuredData";
import { PageContainer } from "@/components/layout/PageContainer";
import { SITE_CONFIG, socialProfileUrls } from "@/config/site";

export const metadata: Metadata = buildHomeMetadata();

export default function HomePage() {
  const appNavItems = getAppNavItems();

  return (
    <PageContainer className="gap-12 py-16">
      <StructuredData data={buildWebsiteJsonLd(SITE_NAME, SITE_URL)} />
      {/* Emitted once, here: it describes the publisher of the whole site,
          not this page. See buildOrganizationJsonLd for why it matters. */}
      <StructuredData
        data={buildOrganizationJsonLd({
          name: SITE_NAME,
          url: SITE_URL,
          legalName: SITE_CONFIG.operator.legalName ?? SITE_CONFIG.operator.name,
          email: SITE_CONFIG.contact.general.email,
          sameAs: socialProfileUrls(),
        })}
      />

      <header className="flex flex-col items-center gap-4 text-center">
        <LocalProcessingBadge />
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Free Online File Tools That Run in Your Browser
        </h1>
        <p className="max-w-xl text-gray-600 dark:text-gray-300">
          Convert, view, edit and analyze files without uploading them. Private by design — your
          files never leave your device.
        </p>
      </header>

      <SiteSearch />
      <UniversalFileDrop />

      <nav aria-label="Applications" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {appNavItems.map((app) => (
          <Link
            key={app.slug}
            href={app.href}
            className="flex flex-col gap-1 rounded-lg border border-gray-200 p-4 hover:border-blue-400 dark:border-gray-800"
          >
            <span className="text-sm font-medium hover:text-blue-600">{app.name}</span>
            {app.capabilities.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {app.capabilities.map((capability) => capability.label).join(" · ")}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <AdSlot placement="category-page" />
    </PageContainer>
  );
}
