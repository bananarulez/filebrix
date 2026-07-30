"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import {
  checkTopology,
  repairGeoJson,
  validateGeoJson,
  type ValidationIssue,
  type ValidationResult,
} from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const isError = issue.severity === "error";
  return (
    <li
      className={`rounded-md border px-3 py-2 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
      }`}
    >
      <span className="font-medium uppercase">{issue.severity}</span> — {issue.message}
      {issue.autoFixable && <span className="ml-2 text-xs opacity-75">(auto-fixable)</span>}
    </li>
  );
}

export function GeoJsonValidatorTool() {
  const { file, geojson } = useGeoWorkspace();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [repairChanges, setRepairChanges] = useState<string[] | null>(null);
  const [repairedBlob, setRepairedBlob] = useState<Blob | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isValidating = !result && !error;

  useEffect(() => {
    if (!geojson) return;

    let cancelled = false;
    (async () => {
      try {
        // Two complementary passes, merged into one list for the user:
        // `validateGeoJson` answers "is this well-formed GeoJSON?"
        // (structural, and the only source of auto-fixable issues), while
        // `checkTopology` answers "is this geometry sane?" (self-
        // intersections, duplicate vertices, degenerate rings). Structural
        // problems come first, and topology is skipped entirely when the
        // structure is already invalid, since turf can't meaningfully read
        // broken geometry.
        const validation = await validateGeoJson(geojson);
        // Wrapped so a synchronous throw is caught too, not just a rejected
        // promise - the geometric pass is strictly additive and must never
        // take down the structural result it augments.
        const topology = validation.valid
          ? await (async () => checkTopology(geojson))().catch(() => [])
          : [];
        if (cancelled) return;
        setResult({
          ...validation,
          issues: [...validation.issues, ...topology],
          valid: validation.valid && !topology.some((issue) => issue.severity === "error"),
        });
      } catch (cause) {
        if (!cancelled) setError(errorFrom(cause, "Could not validate this GeoJSON file."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geojson]);

  async function handleRepair() {
    if (!geojson) return;
    setIsRepairing(true);
    try {
      const { geojson: repaired, changes } = await repairGeoJson(geojson);
      setRepairChanges(changes);
      setRepairedBlob(new Blob([JSON.stringify(repaired, null, 2)], { type: "application/geo+json" }));
    } catch (cause) {
      setError(errorFrom(cause, "Could not repair this GeoJSON file."));
    } finally {
      setIsRepairing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isValidating && <ProcessingStatus state="processing" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {result && (
        <div className="flex flex-col gap-4">
          {result.issues.length === 0 ? (
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
              This GeoJSON is structurally valid — no problems found.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {result.valid ? "Valid, with some warnings" : "Structural problems found"} ({result.issues.length})
              </h3>
              <ul className="flex flex-col gap-2">
                {result.issues.map((issue, index) => (
                  <IssueRow key={index} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {result.canRepair && !repairChanges && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm">
                Some of the issues above can be fixed automatically: unclosed polygon rings will be closed, and any
                feature missing a <code>properties</code> member will get <code>properties: null</code>. Nothing
                else changes — no coordinates are moved, and no features are added or removed.
              </p>
              <button
                type="button"
                onClick={() => void handleRepair()}
                disabled={isRepairing}
                className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isRepairing ? "Repairing…" : "Repair automatically"}
              </button>
            </div>
          )}

          {repairChanges && repairedBlob && file && (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-sm font-medium">What changed</h3>
              {repairChanges.length > 0 ? (
                <ul className="list-inside list-disc text-sm">
                  {repairChanges.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Nothing needed fixing.</p>
              )}
              <DownloadResult
                filename={deriveOutputFilename(file.name, "geojson")}
                blob={repairedBlob}
                label="Download repaired GeoJSON"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
