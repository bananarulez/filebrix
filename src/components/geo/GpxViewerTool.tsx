"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { ElevationProfile } from "@/components/geo/ElevationProfile";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { type ElevationProfilePoint, type GpxTrackStats } from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number | null): string {
  return meters === null ? "—" : `${Math.round(meters)} m`;
}

export function GpxViewerTool() {
  const { geojson, bbox, sourceFormat } = useGeoWorkspace();
  const [stats, setStats] = useState<GpxTrackStats | null>(null);
  const [profile, setProfile] = useState<ElevationProfilePoint[]>([]);
  const [error, setError] = useState<ToolError | null>(null);

  // The workspace already parsed the GPX to GeoJSON; the track statistics and
  // elevation profile are derived from that same document rather than
  // re-reading the file. Both helpers are main-thread-only (DOMParser), so
  // they stay behind the same dynamic import as before.
  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isReading = !stats && !error && sourceFormat === "gpx";

  useEffect(() => {
    if (!geojson || sourceFormat !== "gpx") return;

    let cancelled = false;
    import("@/engines/geospatial/xml/gpx")
      .then(({ computeGpxTrackStats, buildElevationProfile }) => {
        if (cancelled) return;
        setStats(computeGpxTrackStats(geojson));
        setProfile(buildElevationProfile(geojson));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not read this GPX file."));
      })
    return () => {
      cancelled = true;
    };
  }, [geojson, sourceFormat]);

  if (!geojson) return null;

  return (
    <div className="flex flex-col gap-4">
      {isReading && <ProcessingStatus state="reading" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {stats && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Distance</dt>
              <dd className="text-lg font-semibold">{formatDistance(stats.distanceMeters)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Track points</dt>
              <dd className="text-lg font-semibold">{stats.pointCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Elevation gain</dt>
              <dd className="text-lg font-semibold">{formatElevation(stats.elevationGainMeters)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Elevation loss</dt>
              <dd className="text-lg font-semibold">{formatElevation(stats.elevationLossMeters)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Min elevation</dt>
              <dd className="text-lg font-semibold">{formatElevation(stats.minElevationMeters)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Max elevation</dt>
              <dd className="text-lg font-semibold">{formatElevation(stats.maxElevationMeters)}</dd>
            </div>
          </div>

          {!stats.hasElevation && (
            <p className="text-sm text-gray-500">This GPX file doesn&apos;t include elevation data.</p>
          )}

          {profile.length > 1 && <ElevationProfile profile={profile} />}

          <LazyGeoMap geojson={geojson} bbox={bbox} />
        </div>
      )}
    </div>
  );
}
