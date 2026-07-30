import type { ToolDefinition } from "../types";

export const geojsonValidatorTool: ToolDefinition = {
  id: "geojson-validator",
  slug: "geojson-validator",
  name: "GeoJSON Validator",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Check a GeoJSON file for structural problems, with an optional, clearly-explained automatic repair — entirely in your browser.",
  keywords: ["geojson validator", "validate geojson", "geojson repair", "check geojson", "fix geojson"],
  acceptedFileTypes: ["geojson"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Edit tab, locked to
  // "repair") — see appEntry and app/geo/geojson-validator/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "edit" },
  relatedTools: ["geojson-viewer", "geojson-simplifier", "geojson-to-kml"],
  seo: {
    title: "GeoJSON Validator — Free, Private & No Upload",
    description:
      "Validate a GeoJSON file's structure directly in your browser, with a clear list of problems and an optional automatic repair. Nothing is uploaded, and nothing changes unless you ask.",
  },
  faq: [
    {
      question: "Is my GeoJSON file uploaded anywhere?",
      answer: "No. Validation and repair both happen entirely on your device.",
    },
    {
      question: "What does it check?",
      answer:
        "Structural correctness per the GeoJSON specification: recognized types, valid coordinate nesting for each geometry type, closed polygon rings, a present properties member, and coordinates within valid latitude/longitude range.",
    },
    {
      question: "Does it modify my file automatically?",
      answer:
        "Never silently. If auto-fixable issues are found (unclosed polygon rings, a missing properties member), you'll see exactly what would change before choosing to repair — and the result is a new file you download, not a change to your original.",
    },
    {
      question: "What can't be fixed automatically?",
      answer:
        "Anything ambiguous or unsafe to guess at — like out-of-range coordinates (which might mean swapped latitude/longitude, or genuinely bad data) or fundamentally malformed geometry — is reported, not changed for you.",
    },
    {
      question: "Does 'valid' mean my data is geographically correct?",
      answer:
        "No — this checks structure (is it valid GeoJSON), not whether the coordinates represent the place you intended.",
    },
  ],
};
