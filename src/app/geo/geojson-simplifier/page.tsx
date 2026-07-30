import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { GeospatialStudioApp } from "@/components/geo/GeospatialStudioApp";

const TOOL_SLUG = "geojson-simplifier";

const HOW_IT_WORKS_STEPS = [
  "Select or drop a .geojson (or .json) file.",
  "Pick a simplification tolerance — a preset, or a custom value.",
  "Click Simplify to reduce vertex count locally, and preview the result on the map.",
  "Download the simplified .geojson file.",
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
        <GeospatialStudioApp initialTab="edit" lockedEditAction="simplify" />
      </ToolPageLayout>
    </>
  );
}
