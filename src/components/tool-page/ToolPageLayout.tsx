import type { ReactNode } from "react";
import type { ToolDefinition } from "@/registry/types";
import { getRelatedTools, getToolUrl } from "@/registry";
import { CATEGORIES } from "@/registry/categories";
import { getCapabilityForTool, getOwningCategorySlug } from "@/registry/capabilities";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { ToolInstructions } from "@/components/tools/ToolInstructions";
import { FAQ } from "@/components/tools/FAQ";
import { RelatedTools } from "@/components/tools/RelatedTools";
import { ToolArticle } from "@/components/tool-page/ToolArticle";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageContainer, ProseContainer } from "@/components/layout/PageContainer";

interface ToolPageLayoutProps {
  tool: ToolDefinition;
  /** The tool's own interactive UI: drop zone, options, preview, result, download. */
  children: ReactNode;
  /** Numbered steps for the "How it works" section. */
  steps: string[];
  /**
   * Optional long-form reference content, rendered between "How it works"
   * and the FAQ. Only the few pages whose visitors arrive with a real
   * question ("why is my JSON invalid?") have one — see `ToolArticle`.
   */
  article?: ReactNode;
  /** Overridable for tests; defaults to the real registry. */
  toolList?: ToolDefinition[];
}

/**
 * The shared shell every tool page (`app/convert|pdf|tools|geo/[slug]/page.tsx`)
 * renders into — per README.txt §35: title, description, privacy badge, the
 * tool itself above the fold, then how-it-works/FAQ/related tools below.
 * Only the interactive part (`children`) is tool-specific. Always the same
 * reading-width column as every other tool/category page, deliberately —
 * a tool whose own content genuinely needs more room (a wide data grid,
 * say) is expected to break itself out wider via its own CSS (see
 * `AppShell.tsx`'s full-bleed wrapper), not by widening this shared shell,
 * which would make that one tool's page inconsistent with every other page
 * on the site.
 */
export function ToolPageLayout({ tool, children, steps, article, toolList }: ToolPageLayoutProps) {
  const related = getRelatedTools(tool, toolList);
  // Ownership via the shared resolver, not a direct CATEGORIES engine match:
  // Parquet Viewer belongs to Data Studio through STUDIOS[].relatedEngines
  // and has no CATEGORIES entry of its own, so a one-step lookup silently
  // dropped its Application crumb entirely.
  const categorySlug = getOwningCategorySlug(tool);
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  // The Capability level is a real, indexed URL (Home → Application →
  // Capability → Tool, PROJECT_LOG.md entry 21), so the visible trail should
  // pass through it. `undefined` means this tool's capability deliberately
  // has no index page — a Developer Toolkit tool, or a Studio capability
  // with no standalone tools — and the crumb is then omitted rather than
  // rendered as a link to a 404. Derived from the same `indexDescription`
  // signal that decides which capability pages exist at all.
  const capability = getCapabilityForTool(tool, toolList);
  const breadcrumbItems = [
    { name: "Home", href: "/" },
    ...(category ? [{ name: category.name, href: `/${category.slug}` }] : []),
    ...(capability ? [{ name: capability.label, href: capability.path }] : []),
    { name: tool.name, href: getToolUrl(tool) },
  ];

  return (
    <PageContainer className="gap-10 py-12">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={breadcrumbItems} />
        <header className="flex flex-col gap-3">
          <LocalProcessingBadge />
          <h1 className="text-3xl font-semibold">{tool.name}</h1>
          {/* Prose measure, not the full application width — the tool's own
              UI below is what should use the room. */}
          <ProseContainer>
            <p className="text-gray-600 dark:text-gray-300">{tool.description}</p>
          </ProseContainer>
        </header>
      </div>

      <section aria-label={`${tool.name} tool`} className="flex flex-col gap-4">
        {children}
      </section>

      <AdSlot placement="below-tool" />

      <ToolInstructions steps={steps} />

      {article && <ToolArticle>{article}</ToolArticle>}

      <FAQ items={tool.faq ?? []} />

      <RelatedTools tools={related} />
    </PageContainer>
  );
}
