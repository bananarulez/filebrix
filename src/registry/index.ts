import type { DevCategorySlug, Engine, FileFormat, ToolDefinition } from "./types";
import { parquetViewerTool } from "./tools/parquet-viewer";
import { csvViewerTool } from "./tools/csv-viewer";
import { excelViewerTool } from "./tools/excel-viewer";
import { csvToExcelTool } from "./tools/csv-to-excel";
import { excelToCsvTool } from "./tools/excel-to-csv";
import { csvToJsonTool } from "./tools/csv-to-json";
import { jsonToCsvTool } from "./tools/json-to-csv";
import { jsonFormatterTool } from "./tools/json-formatter";
import { jsonMinifierTool } from "./tools/json-minifier";
import { xmlFormatterTool } from "./tools/xml-formatter";
import { xmlValidatorTool } from "./tools/xml-validator";
import { jsonToXmlTool } from "./tools/json-to-xml";
import { xmlToJsonTool } from "./tools/xml-to-json";
import { jsonToYamlTool } from "./tools/json-to-yaml";
import { yamlToJsonTool } from "./tools/yaml-to-json";
import { csvToXmlTool } from "./tools/csv-to-xml";
import { xmlToCsvTool } from "./tools/xml-to-csv";
import { mergePdfTool } from "./tools/merge-pdf";
import { splitPdfTool } from "./tools/split-pdf";
import { rotatePdfTool } from "./tools/rotate-pdf";
import { extractPdfPagesTool } from "./tools/extract-pdf-pages";
import { deletePdfPagesTool } from "./tools/delete-pdf-pages";
import { reorderPdfPagesTool } from "./tools/reorder-pdf-pages";
import { pdfMetadataViewerTool } from "./tools/pdf-metadata-viewer";
import { removePdfMetadataTool } from "./tools/remove-pdf-metadata";
import { imagesToPdfTool } from "./tools/images-to-pdf";
import { pdfToImagesTool } from "./tools/pdf-to-images";
import { pdfToTxtTool } from "./tools/pdf-to-txt";
import { pngToJpgTool } from "./tools/png-to-jpg";
import { jpgToPngTool } from "./tools/jpg-to-png";
import { webpToJpgTool } from "./tools/webp-to-jpg";
import { jpgToWebpTool } from "./tools/jpg-to-webp";
import { pngToWebpTool } from "./tools/png-to-webp";
import { webpToPngTool } from "./tools/webp-to-png";
import { svgToPngTool } from "./tools/svg-to-png";
import { resizeImageTool } from "./tools/resize-image";
import { compressImageTool } from "./tools/compress-image";
import { rotateImageTool } from "./tools/rotate-image";
import { flipImageTool } from "./tools/flip-image";
import { removeImageMetadataTool } from "./tools/remove-image-metadata";
import { imageMetadataViewerTool } from "./tools/image-metadata-viewer";
import { geojsonViewerTool } from "./tools/geojson-viewer";
import { geojsonValidatorTool } from "./tools/geojson-validator";
import { kmlToGeojsonTool } from "./tools/kml-to-geojson";
import { shapefileToGeojsonTool } from "./tools/shapefile-to-geojson";
import { topojsonToGeojsonTool } from "./tools/topojson-to-geojson";
import { geojsonToKmlTool } from "./tools/geojson-to-kml";
import { gpxViewerTool } from "./tools/gpx-viewer";
import { gpxToGeojsonTool } from "./tools/gpx-to-geojson";
import { gpxToKmlTool } from "./tools/gpx-to-kml";
import { geojsonToCsvTool } from "./tools/geojson-to-csv";
import { csvToGeojsonTool } from "./tools/csv-to-geojson";
import { coordinateConverterTool } from "./tools/coordinate-converter";
import { geojsonSimplifierTool } from "./tools/geojson-simplifier";
import { crsConverterTool } from "./tools/crs-converter";
import { geojsonBufferTool } from "./tools/geojson-buffer";
import { geojsonDissolveTool } from "./tools/geojson-dissolve";
import { geojsonStatisticsTool } from "./tools/geojson-statistics";
import { geojsonBoundingBoxTool } from "./tools/geojson-bounding-box";
import { geojsonCentroidTool } from "./tools/geojson-centroid";
import { geojsonConvexHullTool } from "./tools/geojson-convex-hull";
import { utmZoneFinderTool } from "./tools/utm-zone-finder";
import { mapTileCalculatorTool } from "./tools/map-tile-calculator";
import { jsonValidatorTool } from "./tools/json-validator";
import { base64EncodeTool } from "./tools/base64-encode";
import { base64DecodeTool } from "./tools/base64-decode";
import { urlEncodeTool } from "./tools/url-encode";
import { urlDecodeTool } from "./tools/url-decode";
import { uuidGeneratorTool } from "./tools/uuid-generator";
import { hashGeneratorTool } from "./tools/hash-generator";
import { unixTimestampConverterTool } from "./tools/unix-timestamp-converter";
import { textDiffTool } from "./tools/text-diff";
import { jsonDiffTool } from "./tools/json-diff";
import { sqlFormatterTool } from "./tools/sql-formatter";
import { csvToSqlInsertTool } from "./tools/csv-to-sql-insert";
import { wordCounterTool } from "./tools/word-counter";
import { characterCounterTool } from "./tools/character-counter";
import { lineCounterTool } from "./tools/line-counter";
import { removeEmptyLinesTool } from "./tools/remove-empty-lines";
import { removeDuplicateLinesTool } from "./tools/remove-duplicate-lines";
import { sortLinesTool } from "./tools/sort-lines";
import { reverseLinesTool } from "./tools/reverse-lines";
import { trimWhitespaceTool } from "./tools/trim-whitespace";
import { normalizeLineEndingsTool } from "./tools/normalize-line-endings";
import { caseConverterTool } from "./tools/case-converter";
import { htmlEncodeTool } from "./tools/html-encode";
import { htmlDecodeTool } from "./tools/html-decode";
import { unicodeEscapeTool } from "./tools/unicode-escape";
import { unicodeUnescapeTool } from "./tools/unicode-unescape";

/**
 * The tool catalog. Add tools one file at a time under `./tools/*.ts` (each
 * exporting a `ToolDefinition`) and import them here.
 */
export const tools: ToolDefinition[] = [
  parquetViewerTool,
  csvViewerTool,
  excelViewerTool,
  csvToExcelTool,
  excelToCsvTool,
  csvToJsonTool,
  jsonToCsvTool,
  jsonFormatterTool,
  jsonMinifierTool,
  xmlFormatterTool,
  xmlValidatorTool,
  jsonToXmlTool,
  xmlToJsonTool,
  jsonToYamlTool,
  yamlToJsonTool,
  csvToXmlTool,
  xmlToCsvTool,
  mergePdfTool,
  splitPdfTool,
  rotatePdfTool,
  extractPdfPagesTool,
  deletePdfPagesTool,
  reorderPdfPagesTool,
  pdfMetadataViewerTool,
  removePdfMetadataTool,
  imagesToPdfTool,
  pdfToImagesTool,
  pdfToTxtTool,
  pngToJpgTool,
  jpgToPngTool,
  webpToJpgTool,
  jpgToWebpTool,
  pngToWebpTool,
  webpToPngTool,
  svgToPngTool,
  resizeImageTool,
  compressImageTool,
  rotateImageTool,
  flipImageTool,
  removeImageMetadataTool,
  imageMetadataViewerTool,
  geojsonViewerTool,
  geojsonValidatorTool,
  kmlToGeojsonTool,
  shapefileToGeojsonTool,
  topojsonToGeojsonTool,
  geojsonToKmlTool,
  gpxViewerTool,
  gpxToGeojsonTool,
  gpxToKmlTool,
  geojsonToCsvTool,
  csvToGeojsonTool,
  coordinateConverterTool,
  geojsonSimplifierTool,
  crsConverterTool,
  geojsonBufferTool,
  geojsonDissolveTool,
  geojsonStatisticsTool,
  geojsonBoundingBoxTool,
  geojsonCentroidTool,
  geojsonConvexHullTool,
  utmZoneFinderTool,
  mapTileCalculatorTool,
  jsonValidatorTool,
  base64EncodeTool,
  base64DecodeTool,
  urlEncodeTool,
  urlDecodeTool,
  uuidGeneratorTool,
  hashGeneratorTool,
  unixTimestampConverterTool,
  textDiffTool,
  jsonDiffTool,
  sqlFormatterTool,
  csvToSqlInsertTool,
  wordCounterTool,
  characterCounterTool,
  lineCounterTool,
  removeEmptyLinesTool,
  removeDuplicateLinesTool,
  sortLinesTool,
  reverseLinesTool,
  trimWhitespaceTool,
  normalizeLineEndingsTool,
  caseConverterTool,
  htmlEncodeTool,
  htmlDecodeTool,
  unicodeEscapeTool,
  unicodeUnescapeTool,
];

export function getToolBySlug(
  slug: string,
  toolList: ToolDefinition[] = tools
): ToolDefinition | undefined {
  return toolList.find((tool) => tool.slug === slug);
}

export function getToolById(
  id: string,
  toolList: ToolDefinition[] = tools
): ToolDefinition | undefined {
  return toolList.find((tool) => tool.id === id);
}

export function getToolsByEngine(
  engine: Engine,
  toolList: ToolDefinition[] = tools
): ToolDefinition[] {
  return toolList.filter((tool) => tool.engine === engine);
}

export function getToolsByDevCategory(
  devCategory: DevCategorySlug,
  toolList: ToolDefinition[] = tools
): ToolDefinition[] {
  return toolList.filter((tool) => tool.devCategory === devCategory);
}

export function getToolsAcceptingFormat(
  format: FileFormat,
  toolList: ToolDefinition[] = tools
): ToolDefinition[] {
  return toolList.filter((tool) => tool.acceptedFileTypes.includes(format));
}

export function getRelatedTools(
  tool: ToolDefinition,
  toolList: ToolDefinition[] = tools
): ToolDefinition[] {
  return tool.relatedTools
    .map((slug) => getToolBySlug(slug, toolList))
    .filter((related): related is ToolDefinition => Boolean(related));
}

export function getToolUrl(tool: ToolDefinition): string {
  return `/${tool.routeGroup}/${tool.slug}`;
}

export function searchTools(
  query: string,
  toolList: ToolDefinition[] = tools
): ToolDefinition[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  return toolList.filter((tool) =>
    matchesAllTerms(terms, [tool.name, tool.description, ...tool.keywords])
  );
}

/**
 * Splits a query into whitespace-separated terms.
 *
 * Search used to test the *whole* query as one substring, so any multi-word
 * query failed unless that exact phrase appeared verbatim: "view pdf" matched
 * nothing, even though PDF Studio has a View capability, because no single
 * string contains "view pdf". Real users type more than one word.
 */
export function searchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * True when *every* term appears somewhere in the haystack — AND, not OR, so
 * adding a word narrows the results rather than flooding them. Terms may
 * match different fields ("csv excel" finds CSV to Excel via its name; "pdf
 * view" finds PDF Studio via its name and a capability label).
 */
export function matchesAllTerms(terms: string[], haystack: string[]): boolean {
  const text = haystack.join(" ").toLowerCase();
  return terms.every((term) => text.includes(term));
}
