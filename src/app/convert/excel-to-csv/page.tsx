import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "excel-to-csv";

const HOW_IT_WORKS_STEPS = [
  "Select or drop a .xlsx file.",
  "Your browser reads the workbook locally — nothing is uploaded.",
  "Choose a sheet if the workbook has more than one.",
  "A .csv file is built from that sheet's data, entirely on your device, ready to download.",
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
        <SpreadsheetDataApp
          initialMode="convert"
          lockedFormat="xlsx"
          initialOutputFormat="csv"
          toolSlug={tool.slug}
        />
      </ToolPageLayout>
    </>
  );
}
