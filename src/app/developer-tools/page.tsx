import { CATEGORIES } from "@/registry/categories";
import { DEV_CATEGORIES } from "@/registry/devCategories";
import { getToolsByDevCategory } from "@/registry";
import { buildCategoryMetadata } from "@/lib/seo/metadata";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedApplications } from "@/components/seo/RelatedApplications";
import { DevCategoryCard } from "@/components/developer-toolkit/DevCategoryCard";

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
 * with 20+ tools and a filter box) with 5 category cards
 * (`DEV_CATEGORIES` — Text/JSON/Encoding/SQL/Utilities), each linking to
 * its own `/developer-tools/{slug}` page. Tool routes are unchanged; only
 * this navigational layer is new.
 */
export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: CATEGORY.name, href: "/developer-tools" }]} />
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{CATEGORY.name}</h1>
          <p className="text-gray-600 dark:text-gray-300">{CATEGORY.description}</p>
        </header>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DEV_CATEGORIES.map((category) => (
          <DevCategoryCard
            key={category.slug}
            slug={category.slug}
            name={category.name}
            description={category.description}
            toolCount={getToolsByDevCategory(category.slug).length}
          />
        ))}
      </div>

      <AdSlot placement="category-page" />

      <RelatedApplications excludeSlug="developer-tools" />
    </div>
  );
}
