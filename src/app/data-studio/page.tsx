import { CATEGORIES } from "@/registry/categories";
import { getStudioConfig } from "@/registry/studios";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const CATEGORY = CATEGORIES.find((c) => c.slug === "data-studio")!;
const STUDIO = getStudioConfig("data-studio");

export const metadata = buildCategoryMetadata(
  `${CATEGORY.name} — Free, Private & No Upload`,
  CATEGORY.description,
  "/data-studio"
);

/**
 * Unlike the other 5 category pages (plain links list via CategoryPageContent),
 * this is the live, full-featured Data Studio application — Viewer, Editor,
 * Converter and Analyzer for CSV/TSV/Excel/ODS/JSON/XML/YAML/Parquet in one
 * place, with no format locked. Rendered through `StudioLayout`, the generic
 * shell shared by all four Studio pages — see `registry/studios.ts` for this
 * page's configuration (title/description/actions/FAQ/related actions all
 * come from there, not hand-written here). The individual per-format tool
 * pages (CSV Viewer, CSV to Excel, Parquet Viewer, ...) still exist at their
 * own canonical URLs and are still in the sitemap for SEO/direct-search-
 * traffic purposes; `StudioLayout`'s "related actions" section links back to
 * them. `/spreadsheet-tools` (this page's former URL, before Parquet was
 * unified in) permanently redirects here — see `next.config.ts`.
 */
export default function Page() {
  return (
    <StudioLayout studio={STUDIO}>
      <SpreadsheetDataApp initialMode={STUDIO.defaultAction} toolSlug={STUDIO.categorySlug} />
    </StudioLayout>
  );
}
