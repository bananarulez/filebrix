import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/registry/categories";
import { DEV_CATEGORIES } from "@/registry/devCategories";
import { getToolsByDevCategory, getToolUrl } from "@/registry";
import type { DevCategorySlug } from "@/registry/types";
import { buildCategoryMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildItemListJsonLd } from "@/lib/seo/structuredData";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { RelatedApplications } from "@/components/seo/RelatedApplications";
import { CategoryToolFilter } from "@/components/category/CategoryToolFilter";
import { PageContainer, ProseContainer } from "@/components/layout/PageContainer";

const PARENT_CATEGORY = CATEGORIES.find((c) => c.slug === "developer-tools")!;

export function devCategoryMetadata(slug: DevCategorySlug): Metadata {
  const category = DEV_CATEGORIES.find((c) => c.slug === slug);
  if (!category) return {};
  return buildCategoryMetadata(
    `${category.name} Tools — ${PARENT_CATEGORY.name} — Free, Private & No Upload`,
    category.description,
    `/developer-tools/${slug}`
  );
}

/**
 * One Developer Toolkit sub-category page (Text/JSON/Encoding/SQL/
 * Utilities) — same shape as the retired `CategoryPageContent` (breadcrumb,
 * heading, filterable tool list, ad slot), parameterized by `DevCategorySlug`
 * instead of a top-level `CategoryDefinition`, with one extra breadcrumb
 * level (Home → Developer Toolkit → this category). Tool membership comes
 * from each tool's own `devCategory` field (`registry/tools/*.ts`) via
 * `getToolsByDevCategory` — not a second hand-maintained list.
 */
export function DevCategoryPageContent({ slug }: { slug: DevCategorySlug }) {
  const category = DEV_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();
  const tools = getToolsByDevCategory(slug);

  return (
    <PageContainer className="gap-8 py-16">
      {/* Same CollectionPage/ItemList markup the Studio capability index
          pages emit — Developer Toolkit's sub-category pages are the same
          kind of page (an index enumerating tools), so they get the same
          structured data rather than a different shape. */}
      <StructuredData
        data={buildItemListJsonLd(
          `${category.name} — ${PARENT_CATEGORY.name}`,
          category.description,
          `${SITE_URL}/developer-tools/${slug}`,
          tools.map((tool) => ({ name: tool.name, url: `${SITE_URL}${getToolUrl(tool)}` }))
        )}
      />

      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: PARENT_CATEGORY.name, href: "/developer-tools" },
            { name: category.name, href: `/developer-tools/${slug}` },
          ]}
        />
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{category.name}</h1>
          <ProseContainer>
            <p className="text-gray-600 dark:text-gray-300">{category.description}</p>
          </ProseContainer>
        </header>
      </div>

      {tools.length > 0 ? (
        <CategoryToolFilter
          tools={tools.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            href: getToolUrl(tool),
          }))}
        />
      ) : (
        <p className="text-gray-500">More tools coming soon.</p>
      )}

      <AdSlot placement="category-page" />

      <RelatedApplications excludeSlug="developer-tools" />
    </PageContainer>
  );
}
