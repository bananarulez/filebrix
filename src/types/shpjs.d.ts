/**
 * `shpjs` ships no types of its own, and the community `@types/shpjs`
 * package is still on 3.x while this project uses 6.x — pulling in types
 * that describe a different major version is worse than a small, honest
 * local declaration.
 *
 * Only the one call this project makes is declared. The return type is
 * deliberately `unknown`: `shp()` yields either a single FeatureCollection
 * or an array of them depending on how many layers the archive holds, and
 * `engines/geospatial/import/shapefile.ts` normalizes that before anything
 * else sees it.
 */
declare module "shpjs" {
  export default function shp(source: ArrayBuffer | Uint8Array | string): Promise<unknown>;
}
