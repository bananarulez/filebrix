import { CATEGORIES } from "@/registry/categories";
import { getStudioConfig } from "@/registry/studios";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { ImageStudioApp, type ImageStudioTab } from "@/components/image/ImageStudioApp";

const CATEGORY = CATEGORIES.find((c) => c.slug === "image-tools")!;
const STUDIO = getStudioConfig("image-tools");

export const metadata = buildCategoryMetadata(
  `${CATEGORY.name} — Free, Private & No Upload`,
  CATEGORY.description,
  "/image-tools"
);

/**
 * Unlike the other category pages (plain links list via CategoryPageContent),
 * this is the live, full-featured Image Studio application — View, Edit,
 * Convert and Metadata for PNG/JPG/WebP/SVG in one place, with no action
 * locked. Rendered through `StudioLayout`, the generic shell shared by all
 * four Studio pages — see `registry/studios.ts` for this page's
 * configuration. The individual per-tool pages (Resize Image, PNG to JPG,
 * ...) still exist at their own canonical URLs and are still in the sitemap
 * for SEO/direct-search-traffic purposes; `StudioLayout`'s "related actions"
 * section links back to them (same reasoning as `/data-studio` and
 * `/pdf-tools`).
 */
export default function Page() {
  return (
    <StudioLayout studio={STUDIO}>
      <ImageStudioApp initialTab={STUDIO.defaultAction as ImageStudioTab} />
    </StudioLayout>
  );
}
