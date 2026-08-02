import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Reads TopoJSON into GeoJSON.
 *
 * TopoJSON is GeoJSON with shared boundaries stored once instead of twice —
 * the format you get from `d3` pipelines and from most "world/country
 * borders" datasets, and it's typically a fraction of the equivalent
 * GeoJSON's size. Everything downstream of here only understands GeoJSON,
 * so this converts on the way in, exactly like KML and GPX do.
 *
 * `topojson-client` is ~68 KB and has no runtime dependencies (its
 * `commander` dependency is only used by its CLI binaries, which are never
 * imported here). It's dynamically imported so it never lands in a bundle
 * for a tool that doesn't read TopoJSON.
 *
 * Read-only: writing TopoJSON needs `topojson-server`, a separate package
 * whose whole job is topology construction — a different and much larger
 * problem than reading one.
 */
export async function topoJsonTextToGeoJson(text: string): Promise<unknown> {
  let topology: unknown;
  try {
    topology = JSON.parse(text);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", "This file isn't valid JSON, so it can't be TopoJSON.");
  }

  const typed = topology as { type?: unknown; objects?: Record<string, unknown> };
  if (typed?.type !== "Topology" || typeof typed.objects !== "object" || typed.objects === null) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      'This looks like JSON but not TopoJSON — a TopoJSON file has "type": "Topology" and an "objects" member.'
    );
  }

  const { feature } = await import("topojson-client");

  // A topology can hold several named objects (e.g. "countries" and
  // "land"). Each converts to its own FeatureCollection; they're merged so
  // the rest of the app sees one collection, the same normalization the
  // multi-layer shapefile path does.
  const collections = Object.entries(typed.objects).map(([name, object]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- topojson's own types model the topology far more precisely than we can reconstruct from `unknown`.
    const converted = feature(topology as any, object as any) as {
      type: string;
      features?: unknown[];
    };
    const features = converted.type === "FeatureCollection" ? (converted.features ?? []) : [converted];
    return { name, features };
  });

  if (collections.length === 1) {
    return { type: "FeatureCollection", features: collections[0]!.features };
  }

  return {
    type: "FeatureCollection",
    features: collections.flatMap(({ name, features }) =>
      features.map((item) => {
        if (typeof item !== "object" || item === null) return item;
        const typedFeature = item as { properties?: Record<string, unknown> | null };
        return { ...typedFeature, properties: { layer: name, ...(typedFeature.properties ?? {}) } };
      })
    ),
  };
}
