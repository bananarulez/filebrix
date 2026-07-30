import { CATEGORIES } from "@/registry/categories";
import { getStudioConfig } from "@/registry/studios";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { PdfStudioApp, type PdfStudioTab } from "@/components/pdf/PdfStudioApp";

const CATEGORY = CATEGORIES.find((c) => c.slug === "pdf-tools")!;
const STUDIO = getStudioConfig("pdf-tools");

export const metadata = buildCategoryMetadata(
  `${CATEGORY.name} — Free, Private & No Upload`,
  CATEGORY.description,
  "/pdf-tools"
);

/**
 * Unlike the other category pages (plain links list via CategoryPageContent),
 * this is the live, full-featured PDF Studio application — Pages, Convert,
 * Metadata and Security in one place, with no action locked. Rendered
 * through `StudioLayout`, the generic shell shared by all four Studio pages
 * — see `registry/studios.ts` for this page's configuration. The individual
 * per-tool pages (Merge PDF, Split PDF, PDF to Images, ...) still exist at
 * their own canonical URLs and are still in the sitemap for SEO/direct-
 * search-traffic purposes; `StudioLayout`'s "related actions" section links
 * back to them (same reasoning as `/data-studio`).
 */
export default function Page() {
  return (
    <StudioLayout studio={STUDIO}>
      <PdfStudioApp initialTab={STUDIO.defaultAction as PdfStudioTab} />
    </StudioLayout>
  );
}
