import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { GeospatialStudioApp } from "@/components/geo/GeospatialStudioApp";

const TOOL_SLUG = "crs-converter";

const HOW_IT_WORKS_STEPS = [
  "Select or drop a .geojson, .kml or .gpx file.",
  "The source coordinate system is detected automatically when the file declares one — otherwise pick it yourself.",
  "Choose a target CRS: use a quick-select button, search by EPSG code or name, or paste a proj4 definition.",
  "Click Convert CRS, then download the reprojected file. Attributes and geometry types are preserved.",
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
        <GeospatialStudioApp initialTab="convert" lockedConvertAction="crs-converter" />
      </ToolPageLayout>
    </>
  );
}
