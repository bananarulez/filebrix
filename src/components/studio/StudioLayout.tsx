import type { ReactNode } from "react";
import type { StudioConfig } from "@/registry/studios";
import type { ToolDefinition } from "@/registry/types";
import { getToolsByEngine } from "@/registry";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { FAQ } from "@/components/tools/FAQ";
import { RelatedTools } from "@/components/tools/RelatedTools";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildApplicationJsonLd, buildFaqJsonLd } from "@/lib/seo/structuredData";
import { SITE_URL } from "@/lib/seo/metadata";

interface StudioLayoutProps {
  studio: StudioConfig;
  /**
   * The Studio's own interactive application (`SpreadsheetDataApp`,
   * `PdfStudioApp`, `ImageStudioApp`, `GeospatialStudioApp`). It keeps
   * owning its drop zone and its action-navigation tab bar — both are
   * already generic and shared across all four via `AppShell`/`Toolbar`,
   * but stay wired to each app's own file-parsing and mode state, which
   * differs too much per engine to flatten into this layout without
   * rewriting that logic. This component supplies everything *around* the
   * app instead: header, privacy messaging, FAQ, related actions and
   * consistent spacing, so no Studio page hand-rolls that chrome itself.
   */
  children: ReactNode;
  /** Overridable for tests; defaults to the real registry. */
  toolList?: ToolDefinition[];
}

/**
 * The one generic shell every Studio page (`/data-studio`, `/pdf-tools`,
 * `/image-tools`, `/geospatial-tools`) renders into — mirrors
 * `ToolPageLayout`'s role for individual tool pages, one level up, at the
 * Application (product-layer) level. Each Studio provides only
 * configuration (`registry/studios.ts#getStudioConfig`) — this component
 * has no per-Studio knowledge and renders nothing engine-specific itself.
 *
 * Emits `SoftwareApplication` + `FAQPage` JSON-LD, matching what
 * `ToolPageLayout` already emitted one level down. A 2026 SEO review found
 * Studio pages rendered a visible FAQ with no `FAQPage` markup behind it
 * and no application-level structured data at all — the site's largest
 * structured-data inconsistency, since these are its highest-value pages.
 */
export function StudioLayout({ studio, children, toolList }: StudioLayoutProps) {
  const relatedActions = studio.relatedEngines.flatMap((engine) => getToolsByEngine(engine, toolList));
  const url = `${SITE_URL}/${studio.categorySlug}`;

  return (
    <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-8 px-4 py-16">
      <StructuredData data={buildApplicationJsonLd(studio.title, studio.description, url)} />
      {studio.faq.length > 0 && <StructuredData data={buildFaqJsonLd(studio.faq)} />}

      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: studio.title, href: `/${studio.categorySlug}` }]} />
        <header className="flex flex-col gap-3">
          <LocalProcessingBadge />
          <h1 className="text-3xl font-semibold">{studio.title}</h1>
          <p className="text-gray-600 dark:text-gray-300">{studio.description}</p>
        </header>
      </div>

      <section aria-label={`${studio.title} application`} className="flex flex-col gap-4">
        {children}
      </section>

      <AdSlot placement="category-page" />

      <FAQ items={studio.faq} />

      <RelatedTools tools={relatedActions} />
    </div>
  );
}
