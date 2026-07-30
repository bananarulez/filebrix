import type { Metadata } from "next";
import Link from "next/link";
import { SiteSearch } from "@/components/tools/SiteSearch";
import { UniversalFileDrop } from "@/components/tools/UniversalFileDrop";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { AdSlot } from "@/components/tools/AdSlot";
import { StructuredData } from "@/components/seo/StructuredData";
import { getAppNavItems } from "@/registry/navigation";
import { buildHomeMetadata, SITE_NAME, SITE_URL } from "@/lib/seo/metadata";
import { buildWebsiteJsonLd } from "@/lib/seo/structuredData";

export const metadata: Metadata = buildHomeMetadata();

export default function HomePage() {
  const appNavItems = getAppNavItems();

  return (
    <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-12 px-4 py-16">
      <StructuredData data={buildWebsiteJsonLd(SITE_NAME, SITE_URL)} />

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
    </div>
  );
}
