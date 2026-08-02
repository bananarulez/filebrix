import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { GeospatialStudioApp } from "@/components/geo/GeospatialStudioApp";

const TOOL_SLUG = "shapefile-to-geojson";

const HOW_IT_WORKS_STEPS = [
  "Select or drop a .zip containing your shapefile (.shp, .dbf, .shx and ideally .prj).",
  "Your browser unpacks the archive and reads the geometry and attribute table locally.",
  "If a .prj is present, coordinates are reprojected to WGS84 so the result is valid GeoJSON.",
  "Download the resulting .geojson file, or switch to the View tab to see it on a map first.",
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
        <GeospatialStudioApp initialTab="convert" lockedConvertAction="shapefile-to-geojson" />
      </ToolPageLayout>
    </>
  );
}
