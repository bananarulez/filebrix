import { CATEGORIES } from "./categories";
import { STUDIOS } from "./studios";
import { DEV_CATEGORIES } from "./devCategories";

export interface AppNavCapability {
  label: string;
  /**
   * Present only when the capability is independently addressable by its
   * own URL — Developer Toolkit's sub-category pages are real routes, but a
   * Studio's actions (View/Edit/Convert/...) are tabs within one page, not
   * separate routes, so they're previewed as plain (unlinked) text instead
   * of a link that would silently land on the Studio's default tab.
   */
  href?: string;
}

export interface AppNavItem {
  slug: string;
  name: string;
  href: string;
  capabilities: AppNavCapability[];
}

/**
 * Drives the top-level "Applications" navigation (`SiteHeader`,
 * `SiteFooter`, the homepage grid) — one item per `CATEGORIES` entry, each
 * carrying a small, bounded preview of that Application's own capabilities.
 * This is what lets the nav scale with the number of Applications (fixed
 * at 5), never with the number of tools underneath them: capabilities come
 * from `STUDIOS[].actions` (the exact same list that drives each Studio's
 * own in-app tab bar — see `StudioLayout`) for the four Studios, or
 * `DEV_CATEGORIES` (Developer Toolkit's real sub-category pages) for
 * Developer Toolkit — never a third, hand-maintained list, per rule 8.
 */
export function getAppNavItems(): AppNavItem[] {
  return CATEGORIES.map((category) => {
    if (category.slug === "developer-tools") {
      return {
        slug: category.slug,
        name: category.name,
        href: `/${category.slug}`,
        capabilities: DEV_CATEGORIES.map((devCategory) => ({
          label: devCategory.name,
          href: `/developer-tools/${devCategory.slug}`,
        })),
      };
    }

    const studio = STUDIOS.find((s) => s.categorySlug === category.slug);
    return {
      slug: category.slug,
      name: category.name,
      href: `/${category.slug}`,
      capabilities: studio ? studio.actions.map((action) => ({ label: action.label })) : [],
    };
  });
}
