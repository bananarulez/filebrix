import type { ElevationProfilePoint } from "@/engines/geospatial";

interface ElevationProfileProps {
  profile: ElevationProfilePoint[];
  width?: number;
  height?: number;
}

/** A dependency-free inline SVG line chart — this is the only place on the site that needs an elevation chart, so a charting library isn't worth the bundle cost (README.txt §5). */
export function ElevationProfile({ profile, width = 640, height = 160 }: ElevationProfileProps) {
  if (profile.length < 2) return null;

  const padding = 24;
  const distances = profile.map((p) => p.distanceMeters);
  const elevations = profile.map((p) => p.elevationMeters);
  const maxDistance = Math.max(...distances) || 1;
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation || 1;

  const points = profile
    .map((point) => {
      const x = padding + (point.distanceMeters / maxDistance) * (width - padding * 2);
      const y =
        height - padding - ((point.elevationMeters - minElevation) / elevationRange) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-medium">Elevation profile</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Elevation profile ranging from ${Math.round(minElevation)} to ${Math.round(maxElevation)} meters`}
        className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      >
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth={2} />
        <text x={padding} y={16} className="fill-gray-400 text-[10px]">
          {Math.round(maxElevation)} m
        </text>
        <text x={padding} y={height - 8} className="fill-gray-400 text-[10px]">
          {Math.round(minElevation)} m
        </text>
        <text x={width - padding} y={height - 8} textAnchor="end" className="fill-gray-400 text-[10px]">
          {(maxDistance / 1000).toFixed(1)} km
        </text>
      </svg>
    </div>
  );
}
