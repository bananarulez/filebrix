import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "parquet-viewer";

const HOW_IT_WORKS_STEPS = [
  "Select or drop a .parquet file.",
  "Your browser reads the file locally and analyzes its schema — nothing is uploaded.",
  "Browse the row count, column types, and a searchable, sortable preview.",
  "Drop a different file anytime; each one is processed the same way, entirely on your device.",
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
        <SpreadsheetDataApp initialMode="view" lockedFormat="parquet" toolSlug={tool.slug} />
      </ToolPageLayout>
    </>
  );
}
