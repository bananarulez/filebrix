import { CATEGORIES } from "@/registry/categories";
import { getStudioConfig } from "@/registry/studios";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { GeospatialStudioApp, type GeospatialStudioTab } from "@/components/geo/GeospatialStudioApp";

const CATEGORY = CATEGORIES.find((c) => c.slug === "geospatial-tools")!;
const STUDIO = getStudioConfig("geospatial-tools");

export const metadata = buildCategoryMetadata(
  `${CATEGORY.name} — Free, Private & No Upload`,
  CATEGORY.description,
  "/geospatial-tools"
);

/**
 * Unlike the other category pages (plain links list via CategoryPageContent),
 * this is the live, full-featured Geospatial Studio application — View,
 * Edit, Analyze and Convert for GeoJSON/KML/GPX/CSV in one place, with no
 * action locked. Rendered through `StudioLayout`, the generic shell shared
 * by all four Studio pages — see `registry/studios.ts` for this page's
 * configuration. The individual per-tool pages (GeoJSON Viewer, KML to
 * GeoJSON, ...) still exist at their own canonical URLs and are still in
 * the sitemap for SEO/direct-search-traffic purposes; `StudioLayout`'s
 * "related actions" section links back to them (same reasoning as
 * `/data-studio`, `/pdf-tools` and `/image-tools`).
 */
export default function Page() {
  return (
    <StudioLayout studio={STUDIO}>
      <GeospatialStudioApp initialTab={STUDIO.defaultAction as GeospatialStudioTab} />
    </StudioLayout>
  );
}
