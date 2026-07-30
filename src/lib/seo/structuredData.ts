import type { ToolDefinition, ToolFaqItem } from "@/registry/types";

/**
 * These builders only ever consume data we authored ourselves (registry
 * entries) — never pipe raw file content or other user-derived text through
 * them, since the result is serialized straight into a <script> tag by
 * components/seo/StructuredData.tsx.
 */
/**
 * `SoftwareApplication` markup from plain fields — used directly by
 * `StudioLayout` for an Application (which has no `ToolDefinition`), and
 * via `buildSoftwareApplicationJsonLd` below for an individual tool, so
 * both levels emit structurally identical markup rather than two
 * near-duplicate shapes that could drift.
 */
export function buildApplicationJsonLd(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in the browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function buildSoftwareApplicationJsonLd(tool: ToolDefinition, url: string) {
  return buildApplicationJsonLd(tool.name, tool.seo.description, url);
}

export function buildFaqJsonLd(faq: ToolFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * `CollectionPage` + nested `ItemList` for an index page (a capability page
 * or a Developer Toolkit sub-category page) — tells a crawler the page's
 * purpose is to enumerate the linked items, rather than leaving it to infer
 * that from a list of anchors. `items` must be in the same order the page
 * renders them, since `position` is derived from array order.
 */
export function buildItemListJsonLd(
  name: string,
  description: string,
  url: string,
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

export function buildWebsiteJsonLd(siteName: string, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  };
}

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

/** `items` should read root-to-leaf (e.g. Home, then category, then the current page) — position is derived from array order, not passed in by the caller. */
export function buildBreadcrumbJsonLd(items: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
