import type { ToolDefinition } from "../types";

export const shapefileToGeojsonTool: ToolDefinition = {
  id: "shapefile-to-geojson",
  slug: "shapefile-to-geojson",
  name: "Shapefile to GeoJSON Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description:
    "Convert a zipped Esri Shapefile to GeoJSON in your browser, reprojecting it to WGS84 automatically — nothing is uploaded.",
  keywords: [
    "shapefile to geojson",
    "shp to geojson",
    "convert shapefile online",
    "open shp file",
    "esri shapefile converter",
  ],
  acceptedFileTypes: ["shapefile"],
  outputFileTypes: ["geojson"],
  appEntry: {
    app: "geospatial-studio",
    mode: "convert",
    lockedFormat: "shapefile",
    outputFormat: "geojson",
  },
  relatedTools: ["geojson-viewer", "geojson-to-kml", "geojson-to-csv"],
  seo: {
    title: "Shapefile to GeoJSON Converter — Free, Private & No Upload",
    description:
      "Convert zipped Esri Shapefiles (.shp/.dbf/.prj) to GeoJSON directly in your browser. Projected coordinate systems are converted to WGS84 automatically — your file never leaves your device.",
  },
  faq: [
    {
      question: "Why do I need to upload a ZIP instead of the .shp file?",
      answer:
        "A shapefile isn't a single file. Geometry lives in the .shp, attributes in the .dbf, and the coordinate system in the .prj. A .shp on its own has no attribute data and no way to know where on Earth it belongs, so the whole set has to travel together — which is why shapefiles are almost always distributed as a ZIP.",
    },
    {
      question: "Is my shapefile uploaded anywhere?",
      answer:
        "No. The archive is unpacked and converted entirely in your browser. Nothing is sent to a server at any point.",
    },
    {
      question: "What happens to the coordinate system?",
      answer:
        "If the ZIP contains a .prj file, the coordinates are reprojected to WGS84 (longitude/latitude), which is what GeoJSON requires. National grids such as the Czech S-JTSK/Krovak, British National Grid and UTM zones are all handled. Without a .prj, coordinates are passed through unchanged, since guessing a projection would silently move your data.",
    },
    {
      question: "Are attributes from the .dbf kept?",
      answer: "Yes. Every attribute column becomes a property on the matching GeoJSON feature.",
    },
    {
      question: "Can I convert GeoJSON back to a Shapefile?",
      answer:
        "Not currently. Writing a shapefile means producing four separate files with fixed-width columns and a 10-character limit on field names, which would silently truncate longer property names. Rather than ship a lossy export, this tool is read-only for now.",
    },
  ],
};
