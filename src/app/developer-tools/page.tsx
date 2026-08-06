import { CATEGORIES } from "@/registry/categories";
import { DEV_CATEGORIES, DEVELOPER_TOOLKIT_FAQ } from "@/registry/devCategories";
import { getToolsByDevCategory, getToolUrl } from "@/registry";
import { buildCategoryMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildApplicationJsonLd, buildFaqJsonLd } from "@/lib/seo/structuredData";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { RelatedApplications } from "@/components/seo/RelatedApplications";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { FAQ } from "@/components/tools/FAQ";
import { DevCategoryCard } from "@/components/developer-toolkit/DevCategoryCard";
import { PageContainer, ProseContainer } from "@/components/layout/PageContainer";

const CATEGORY = CATEGORIES.find((c) => c.slug === "developer-tools")!;

export const metadata = buildCategoryMetadata(
  `${CATEGORY.name} — Free, Private & No Upload`,
  CATEGORY.description,
  "/developer-tools"
);

/**
 * Developer Toolkit is intentionally NOT a Studio — unlike the four
 * file-based unified apps, it's a categorized collection of independent
 * utilities (README.txt's own framing for this engine still holds: each
 * tool is its own thing, not a tab in one shared workspace). This landing
 * page replaces the old flat `CategoryPageContent` link-list (a single page
 * with 20+ tools and a filter box) with category cards (`DEV_CATEGORIES` —
 * Text/Encoding/SQL/Utilities), each linking to its own
 * `/developer-tools/{slug}` page. Tool routes are unchanged; only this
 * navigational layer is new.
 *
 * **Not being a Studio is a product decision, not a licence to be thinner.**
 * This page shipped for a while as a heading, one sentence and four
 * count-only cards: no tool was named anywhere on it, there was no FAQ, no
 * local-processing badge, and the only structured data was the breadcrumb —
 * while every one of the four Studio pages emitted `SoftwareApplication` +
 * `FAQPage` and every sub-category page below it emitted `CollectionPage`.
 * The Application level of one fifth of the site was the weakest page in its
 * own hierarchy. It now carries the same three signals its siblings do; what
 * stays different is only what genuinely differs — cards for independent
 * categories rather than a tabbed workspace.
 *
 * `SoftwareApplication` rather than `CollectionPage`: this is an Application
 * page (the same level as `/pdf-studio`), and the `CollectionPage`/`ItemList`
 * shape belongs to the index pages one level down. Emitting both would claim
 * two page types for one URL.
 */
export default function Page() {
  const categories = DEV_CATEGORIES.map((category) => ({
    ...category,
    tools: getToolsByDevCategory(category.slug).map((tool) => ({
      id: tool.id,
      name: tool.name,
      href: getToolUrl(tool),
    })),
  }));

  return (
    <PageContainer className="gap-8 py-16">
      <StructuredData
        data={buildApplicationJsonLd(CATEGORY.name, CATEGORY.description, `${SITE_URL}/developer-tools`)}
      />
      <StructuredData data={buildFaqJsonLd(DEVELOPER_TOOLKIT_FAQ)} />

      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: CATEGORY.name, href: "/developer-tools" }]} />
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold">{CATEGORY.name}</h1>
          <ProseContainer>
            <p className="text-gray-600 dark:text-gray-300">{CATEGORY.description}</p>
          </ProseContainer>
          <LocalProcessingBadge />
        </header>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <DevCategoryCard
            key={category.slug}
            slug={category.slug}
            name={category.name}
            description={category.description}
            tools={category.tools}
          />
        ))}
      </div>

      <AdSlot placement="category-page" />

      <FAQ items={DEVELOPER_TOOLKIT_FAQ} />

      <RelatedApplications excludeSlug="developer-tools" />
    </PageContainer>
  );
}
