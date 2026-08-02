import type { MetadataRoute } from "next";
import { tools, getToolUrl } from "@/registry";
import { CATEGORIES } from "@/registry/categories";
import { DEV_CATEGORIES } from "@/registry/devCategories";
import { getAllCapabilities } from "@/registry/capabilities";
import { SITE_URL } from "@/lib/seo/metadata";

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

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${SITE_URL}${getToolUrl(tool)}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...contentRoutes, ...toolRoutes];
}
