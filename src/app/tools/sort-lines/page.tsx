import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SortLinesTool } from "./SortLinesTool";

const TOOL_SLUG = "sort-lines";

const HOW_IT_WORKS_STEPS = [
  "Paste text, or open a file.",
  "Choose A → Z or Z → A.",
  "Click Sort lines, then copy or download the result.",
];

export function generateMetadata(): Metadata {
  const tool = getToolBySlug(TOOL_SLUG);
  if (!tool) return {};
  return buildToolMetadata(tool);
}

export default function Page() {
  const tool = getToolBySlug(TOOL_SLUG);
  if (!tool) notFound();

  const url = `${SITE_URL}/${tool.routeGroup}/${tool.slug}`;

  return (
    <>
      <StructuredData data={buildSoftwareApplicationJsonLd(tool, url)} />
      {tool.faq && tool.faq.length > 0 && <StructuredData data={buildFaqJsonLd(tool.faq)} />}
      <ToolPageLayout tool={tool} steps={HOW_IT_WORKS_STEPS}>
        <SortLinesTool />
      </ToolPageLayout>
    </>
  );
}
