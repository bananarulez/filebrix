import type { ReactNode } from "react";
import type { ToolDefinition } from "@/registry/types";
import { getRelatedTools, getToolUrl } from "@/registry";
import { CATEGORIES } from "@/registry/categories";
import { LocalProcessingBadge } from "@/components/tools/LocalProcessingBadge";
import { ToolInstructions } from "@/components/tools/ToolInstructions";
import { FAQ } from "@/components/tools/FAQ";
import { RelatedTools } from "@/components/tools/RelatedTools";
import { AdSlot } from "@/components/tools/AdSlot";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface ToolPageLayoutProps {
  tool: ToolDefinition;
  /** The tool's own interactive UI: drop zone, options, preview, result, download. */
  children: ReactNode;
  /** Numbered steps for the "How it works" section. */
  steps: string[];
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
export function ToolPageLayout({ tool, children, steps, toolList }: ToolPageLayoutProps) {
  const related = getRelatedTools(tool, toolList);
  const category = CATEGORIES.find((c) => c.engine === tool.engine);
  const breadcrumbItems = [
    { name: "Home", href: "/" },
    ...(category ? [{ name: category.name, href: `/${category.slug}` }] : []),
    { name: tool.name, href: getToolUrl(tool) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[54rem] flex-col gap-10 px-4 py-12">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={breadcrumbItems} />
        <header className="flex flex-col gap-3">
          <LocalProcessingBadge />
          <h1 className="text-3xl font-semibold">{tool.name}</h1>
          <p className="text-gray-600 dark:text-gray-300">{tool.description}</p>
        </header>
      </div>

      <section aria-label={`${tool.name} tool`} className="flex flex-col gap-4">
        {children}
      </section>

      <AdSlot placement="below-tool" />

      <ToolInstructions steps={steps} />

      <FAQ items={tool.faq ?? []} />

      <RelatedTools tools={related} />
    </div>
  );
}
