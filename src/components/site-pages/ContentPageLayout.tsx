import type { ReactNode } from "react";
import { ProseContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SITE_CONFIG } from "@/config/site";

interface ContentPageLayoutProps {
  title: string;
  /**
   * This page's own URL, passed rather than derived.
   *
   * It used to be computed from `title` —
   * `/${title.toLowerCase().replace(/\s+/g, "-")}` — which happens to be right
   * for "About" and "Contact" and was wrong for the other two: "Privacy
   * Policy" produced `/privacy-policy` and "Terms of Service" produced
   * `/terms-of-service`, neither of which exists. Both shipped, so those pages
   * handed Google `BreadcrumbList` structured data whose final URL 404s
   * (verified against the live site, not inferred).
   *
   * Nothing catches that by looking: the visible trail renders the *title*, so
   * it reads correctly while the machine-readable half points somewhere else.
   * Deriving a URL from a display string couples two things that are allowed
   * to differ, so the derivation is gone rather than patched.
   */
  path: string;
  /** One or two sentences under the H1. */
  intro: string;
  children: ReactNode;
  /** Legal pages show when they last changed; About and Contact don't need to. */
  showLastUpdated?: boolean;
}

/**
 * The shell for the site's *reading* pages — About, Contact, Privacy, Terms.
 *
 * These are the one page type with no interactive tool on them, so unlike
 * `ToolPageLayout`/`StudioLayout` they use `ProseContainer` directly rather
 * than `PageContainer`: there is nothing wide to lay out, and a 1520px-wide
 * paragraph of policy text is unreadable. Same call `not-found.tsx` makes.
 *
 * `Breadcrumbs` is included for the same reason every other page type has it
 * — it renders the visible trail and its `BreadcrumbList` JSON-LD from one
 * `items` array, so the two can't disagree.
 */
export function ContentPageLayout({
  title,
  path,
  intro,
  children,
  showLastUpdated,
}: ContentPageLayoutProps) {
  return (
    <ProseContainer className="mx-auto flex flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: title, href: path },
          ]}
        />
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-gray-600 dark:text-gray-300">{intro}</p>
          {showLastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated{" "}
              <time dateTime={SITE_CONFIG.legal.lastUpdated}>{SITE_CONFIG.legal.lastUpdated}</time>
            </p>
          )}
        </header>
      </div>

      <div className="flex flex-col gap-6 text-gray-700 dark:text-gray-300">{children}</div>
    </ProseContainer>
  );
}

/** A titled section, so the four pages don't each re-declare the same heading styles. */
export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
