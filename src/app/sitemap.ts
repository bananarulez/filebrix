import type { MetadataRoute } from "next";
import { tools, getToolUrl } from "@/registry";
import { CATEGORIES } from "@/registry/categories";
import { DEV_CATEGORIES } from "@/registry/devCategories";
import { getAllCapabilities } from "@/registry/capabilities";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Required by `output: "export"`: without it the build fails with
 * "export const dynamic = \"force-static\" ... not configured on route".
 * Nothing here reads a request — the content is derived entirely from the
 * registry at build time — so being static is a statement of fact, not a
 * constraint. `app/.well-known/security.txt/route.ts` carries it for the
 * same reason.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...CATEGORIES.map((category) => ({
      url: `${SITE_URL}/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Developer Toolkit's sub-category pages (Text/Encoding/SQL/Utilities)
    // — not top-level CATEGORIES entries, so listed separately.
    ...DEV_CATEGORIES.map((category) => ({
      url: `${SITE_URL}/developer-tools/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    // The four Studios' capability index pages (`/pdf-studio/pages`, …) —
    // the same 0.6 priority as Developer Toolkit's sub-category pages,
    // since they're the same layer of the hierarchy (below an Application,
    // above a tool). Derived from `getAllCapabilities()`, so a capability
    // that has no index page (no tools) is never listed here either.
    ...getAllCapabilities().map((capability) => ({
      url: `${SITE_URL}${capability.path}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  // About/Contact/Privacy/Terms. Low priority — they're trust and compliance
  // pages, not search targets — but indexed on purpose: "who runs this site"
  // is exactly what a search engine looks for when judging whether a tool
  // that handles people's documents is accountable.
  const contentRoutes: MetadataRoute.Sitemap = ["/about", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  // Editorial content, listed apart from the trust pages above because it is
  // a genuine search target rather than a compliance page — it answers the
  // category-level question ("is this safe at all?") that every tool page
  // deliberately doesn't, since those target one format each. Priority sits
  // between a capability index and a tool for that reason.
  const guideRoutes: MetadataRoute.Sitemap = ["/are-online-file-converters-safe"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${SITE_URL}${getToolUrl(tool)}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...contentRoutes, ...guideRoutes, ...toolRoutes];
}
