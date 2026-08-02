"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { studioTabId } from "@/components/app-shell/tabIds";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { GeoJsonViewerTool } from "./GeoJsonViewerTool";
import { GpxViewerTool } from "./GpxViewerTool";
import { GeoJsonSimplifierTool } from "./GeoJsonSimplifierTool";
import { GeoJsonValidatorTool } from "./GeoJsonValidatorTool";
import { GeoAnalyzeTool } from "./GeoAnalyzeTool";
import { GeoConverterTool, type GeoConversionKind } from "./GeoConverterTool";
import { CsvToGeoJsonTool } from "./CsvToGeoJsonTool";
import { CoordinateConverterTool } from "./CoordinateConverterTool";
import { GeoOperationTool, type GeoOperation } from "./GeoOperationTool";
import { CrsConverterTool } from "./CrsConverterTool";
import { GeoStatisticsTool } from "./GeoStatisticsTool";
import { GeoCalculatorTool } from "./GeoCalculatorTool";
import { GeoFilePanel, GeoWorkspace, useGeoWorkspace } from "./GeoWorkspace";
import { actionNeedsFile, buildDisabledReasons } from "./actionFormats";

export type GeospatialStudioTab = "view" | "edit" | "analyze" | "convert";
export type ViewAction = "geojson" | "gpx";
export type EditAction =
  | "simplify"
  | "repair"
  | "buffer"
  | "dissolve"
  | "merge"
  | "split-multi";
/** Analyze gained a picker once it hosted more than the one summary view. */
export type AnalyzeAction = "summary" | "statistics" | "centroid" | "bounding-box" | "convex-hull";
export type ConvertAction =
  | GeoConversionKind
  | "csv-to-geojson"
  | "coordinate-converter"
  | "crs-converter"
  | "utm-zone-finder"
  | "map-tile-calculator";

interface GeospatialStudioAppProps {
  initialTab?: GeospatialStudioTab;
  /** Hides the View action picker — used by /geo/geojson-viewer and
   * /geo/gpx-viewer so each keeps its own narrow SEO promise true. The
   * top-level tab bar stays switchable regardless. */
  lockedViewAction?: ViewAction;
  /** Hides the Edit action picker — used by /geo/geojson-simplifier and
   * /geo/geojson-validator. */
  lockedEditAction?: EditAction;
  /** Hides the Analyze action picker — used by the Analyze-family tool URLs. */
  lockedAnalyzeAction?: AnalyzeAction;
  /** Hides the Convert action picker — used by all 8 convert-family URLs. */
  lockedConvertAction?: ConvertAction;
}

const TAB_OPTIONS: ToolbarModeOption<GeospatialStudioTab>[] = [
  { id: "view", label: "View" },
  { id: "edit", label: "Edit" },
  { id: "analyze", label: "Analyze" },
  { id: "convert", label: "Convert" },
];

const EDIT_ACTIONS: EditAction[] = [
  "simplify",
  "repair",
  "buffer",
  "dissolve",
  "merge",
  "split-multi",
];
const EDIT_ACTION_LABEL: Record<EditAction, string> = {
  simplify: "Simplify",
  repair: "Validate & Repair",
  buffer: "Buffer",
  dissolve: "Dissolve",
  merge: "Merge Features",
  "split-multi": "Split Multi",
};

const ANALYZE_ACTIONS: AnalyzeAction[] = ["summary", "statistics", "centroid", "bounding-box", "convex-hull"];
const ANALYZE_ACTION_LABEL: Record<AnalyzeAction, string> = {
  summary: "Summary",
  statistics: "Statistics",
  centroid: "Centroid",
  "bounding-box": "Bounding Box",
  "convex-hull": "Convex Hull",
};

/**
 * Edit/Analyze actions backed by the shared, parameterized
 * `GeoOperationTool` rather than a bespoke component. They span two tabs
 * because the split is a product decision (reshaping data vs. describing
 * it), not an implementation one — all seven are the same load/derive/
 * download flow underneath.
 */
const OPERATION_ACTIONS = new Set<string>([
  "buffer",
  "dissolve",
  "merge",
  "split-multi",
  "centroid",
  "bounding-box",
  "convex-hull",
]);

const CONVERT_ACTIONS: ConvertAction[] = [
  "shapefile-to-geojson",
  "topojson-to-geojson",
  "kml-to-geojson",
  "geojson-to-kml",
  "gpx-to-geojson",
  "gpx-to-kml",
  "geojson-to-csv",
  "csv-to-geojson",
  "coordinate-converter",
  "crs-converter",
  "utm-zone-finder",
  "map-tile-calculator",
];
const CONVERT_ACTION_LABEL: Record<ConvertAction, string> = {
  "shapefile-to-geojson": "Shapefile to GeoJSON",
  "topojson-to-geojson": "TopoJSON to GeoJSON",
  "kml-to-geojson": "KML to GeoJSON",
  "geojson-to-kml": "GeoJSON to KML",
  "gpx-to-geojson": "GPX to GeoJSON",
  "gpx-to-kml": "GPX to KML",
  "geojson-to-csv": "GeoJSON to CSV",
  "csv-to-geojson": "CSV to GeoJSON",
  "coordinate-converter": "Coordinate Converter",
  "crs-converter": "CRS Converter",
  "utm-zone-finder": "UTM Zone Finder",
  "map-tile-calculator": "Map Tile Calculator",
};


/**
 * The registry slug behind each action that has a standalone tool page, so
 * the Studio's one shared drop zone can claim a file handed over by the
 * homepage's Universal File Drop (CLAUDE.md rule 9). Actions with no entry
 * (Summary, Merge Features, Split Multi) exist only inside the Studio and
 * are never a handoff target.
 *
 * Consolidating the ten tools' drop zones into `GeoFilePanel` dropped this
 * wiring: each tool used to pass its own `toolSlug`, and the shared panel
 * was rendered with none.
 */
const TOOL_SLUG_BY_ACTION: Record<string, string> = {
  geojson: "geojson-viewer",
  gpx: "gpx-viewer",
  simplify: "geojson-simplifier",
  repair: "geojson-validator",
  buffer: "geojson-buffer",
  dissolve: "geojson-dissolve",
  statistics: "geojson-statistics",
  centroid: "geojson-centroid",
  "bounding-box": "geojson-bounding-box",
  "convex-hull": "geojson-convex-hull",
  "shapefile-to-geojson": "shapefile-to-geojson",
  "topojson-to-geojson": "topojson-to-geojson",
  "kml-to-geojson": "kml-to-geojson",
  "geojson-to-kml": "geojson-to-kml",
  "gpx-to-geojson": "gpx-to-geojson",
  "gpx-to-kml": "gpx-to-kml",
  "geojson-to-csv": "geojson-to-csv",
  "csv-to-geojson": "csv-to-geojson",
  "crs-converter": "crs-converter",
  "utm-zone-finder": "utm-zone-finder",
  "map-tile-calculator": "map-tile-calculator",
};

function CsvNeedsConvertingNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      <p className="font-medium text-gray-900 dark:text-white">A CSV file has no geometry to preview yet</p>
      <p>
        Turn it into geometry first with Convert &rarr; CSV to GeoJSON, then come back to View. Nothing is
        uploaded either way.
      </p>
    </div>
  );
}

function isConversionKind(action: ConvertAction): action is GeoConversionKind {
  return (
    action !== "csv-to-geojson" &&
    action !== "coordinate-converter" &&
    action !== "crs-converter" &&
    action !== "utm-zone-finder" &&
    action !== "map-tile-calculator"
  );
}

/**
 * One shared shell hosting all 11 existing geospatial tools, every one of
 * them reused unchanged (plus one widened viewer and one new Analyze tab),
 * via lightweight action pickers rather than one component forced to
 * render every layout. `GeoJsonViewerTool` (GeoJSON + KML, via its new
 * `acceptKml` prop) and `GpxViewerTool` have genuinely different layouts —
 * property table vs. elevation profile — so View hosts both side by side
 * instead of merging them. Convert's 7 actions include the already-shared
 * `GeoConverterTool` (5 `kind` values), plus `CsvToGeoJsonTool` (needs a
 * column-mapping step the others don't) and `CoordinateConverterTool` (a
 * text converter, not file-based) as the two structurally different
 * remaining actions.
 *
 * Every `lockedX` prop hides only the sub-picker for that one tab — the
 * top-level View/Edit/Analyze/Convert tab bar always stays switchable,
 * matching Data/PDF/Image Studio.
 *
 * The active action's own registry slug is passed to the shared
 * `GeoFilePanel` (see `TOOL_SLUG_BY_ACTION`) so the homepage's Universal
 * File Drop handoff still reaches whichever tool the user is on.
 */
/**
 * Wraps the Studio in the shared `GeoWorkspace`, which owns the one loaded
 * file and the single drop zone above the tabs. Split in two because the
 * inner component has to *read* that context, and a component can't consume
 * a provider it renders itself.
 */
export function GeospatialStudioApp(props: GeospatialStudioAppProps) {
  return (
    <GeoWorkspace>
      <GeospatialStudioBody {...props} />
    </GeoWorkspace>
  );
}

function GeospatialStudioBody({
  initialTab = "view",
  lockedViewAction,
  lockedEditAction,
  lockedAnalyzeAction,
  lockedConvertAction,
}: GeospatialStudioAppProps) {
  const { sourceFormat, documentKey } = useGeoWorkspace();
  const [tab, setTab] = useState<GeospatialStudioTab>(initialTab);
  const [editAction, setEditAction] = useState<EditAction>(lockedEditAction ?? "simplify");
  const [analyzeAction, setAnalyzeAction] = useState<AnalyzeAction>(lockedAnalyzeAction ?? "summary");
  const [convertAction, setConvertAction] = useState<ConvertAction>(lockedConvertAction ?? "kml-to-geojson");

  const editDisabled = buildDisabledReasons(EDIT_ACTIONS, sourceFormat);
  const analyzeDisabled = buildDisabledReasons(ANALYZE_ACTIONS, sourceFormat);
  const convertDisabled = buildDisabledReasons(CONVERT_ACTIONS, sourceFormat);

  /**
   * If the loaded file's format rules out the action the user had selected,
   * fall back to the first one it *does* support rather than rendering a tool
   * that can't run. A locked action is never overridden — that page promised
   * one specific tool, and it shows its own error for a wrong file instead.
   */
  function resolve<T extends string>(
    locked: T | undefined,
    selected: T,
    actions: readonly T[],
    disabled: Partial<Record<T, string>>
  ): T {
    if (locked) return locked;
    if (!disabled[selected]) return selected;
    return actions.find((action) => !disabled[action]) ?? selected;
  }

  /**
   * View has no action picker: the workspace already detected the format, so
   * asking the user to pick "GeoJSON / KML" vs "GPX" only asks them to repeat
   * what the file itself says (and the drop zone and the page description
   * both already list the accepted formats). Image and PDF Studio's View tabs
   * have no picker either — this was the odd one out. A locked page still
   * pins its own viewer, since /geo/gpx-viewer promises exactly one tool.
   */
  const activeViewAction: ViewAction = lockedViewAction ?? (sourceFormat === "gpx" ? "gpx" : "geojson");
  const activeEditAction = resolve(lockedEditAction, editAction, EDIT_ACTIONS, editDisabled);
  const activeAnalyzeAction = resolve(lockedAnalyzeAction, analyzeAction, ANALYZE_ACTIONS, analyzeDisabled);
  const activeConvertAction = resolve(lockedConvertAction, convertAction, CONVERT_ACTIONS, convertDisabled);

  /**
   * The active action decides whether the file panel is shown at all — the
   * coordinate converter works on pasted text and has nothing to do with a
   * loaded file, so a drop zone above it would be noise. Same rule Data
   * Studio applies to its paste-first actions.
   */
  const activeAction =
    tab === "view" ? activeViewAction : tab === "edit" ? activeEditAction : tab === "analyze" ? activeAnalyzeAction : activeConvertAction;

  return (
    <AppShell activeTabId={studioTabId(tab)} toolbar={<Toolbar modes={TAB_OPTIONS} activeMode={tab} onModeChange={setTab} />}>
      {/*
       * Order matches Data/PDF/Image Studio: tab bar (in the shell's own
       * toolbar slot) -> action picker -> drop zone -> the tool's own UI.
       * The drop zone used to sit above the whole shell, which made this the
       * one Studio whose file input came before its tabs.
       */}
      <div className="flex flex-col gap-4">
        {tab === "edit" && !lockedEditAction && (
          <ActionPicker
            options={EDIT_ACTIONS}
            labels={EDIT_ACTION_LABEL}
            disabledReasons={editDisabled}
            active={activeEditAction}
            onChange={setEditAction}
          />
        )}
        {tab === "analyze" && !lockedAnalyzeAction && (
          <ActionPicker
            options={ANALYZE_ACTIONS}
            labels={ANALYZE_ACTION_LABEL}
            disabledReasons={analyzeDisabled}
            active={activeAnalyzeAction}
            onChange={setAnalyzeAction}
          />
        )}
        {tab === "convert" && !lockedConvertAction && (
          <ActionPicker
            options={CONVERT_ACTIONS}
            labels={CONVERT_ACTION_LABEL}
            disabledReasons={convertDisabled}
            active={activeConvertAction}
            onChange={setConvertAction}
          />
        )}

        {actionNeedsFile(activeAction) && <GeoFilePanel toolSlug={TOOL_SLUG_BY_ACTION[activeAction]} />}

        {tab === "view" &&
          (sourceFormat === "csv" ? (
            <CsvNeedsConvertingNotice />
          ) : activeViewAction === "gpx" ? (
            <GpxViewerTool key={`gpx-${documentKey}`} />
          ) : (
            <GeoJsonViewerTool key={`geojson-${documentKey}`} acceptKml={!lockedViewAction} />
          ))}

        {tab === "edit" && (
          <>
            {activeEditAction === "simplify" && <GeoJsonSimplifierTool key={`simplify-${documentKey}`} />}
            {activeEditAction === "repair" && <GeoJsonValidatorTool key={`repair-${documentKey}`} />}
            {OPERATION_ACTIONS.has(activeEditAction) && (
              <GeoOperationTool key={`${activeEditAction}-${documentKey}`} operation={activeEditAction as GeoOperation} />
            )}
          </>
        )}

        {tab === "analyze" && (
          <>
            {activeAnalyzeAction === "summary" && <GeoAnalyzeTool key={`summary-${documentKey}`} />}
            {activeAnalyzeAction === "statistics" && <GeoStatisticsTool key={`statistics-${documentKey}`} />}
            {OPERATION_ACTIONS.has(activeAnalyzeAction) && (
              <GeoOperationTool key={`${activeAnalyzeAction}-${documentKey}`} operation={activeAnalyzeAction as GeoOperation} />
            )}
          </>
        )}

        {tab === "convert" && (
          <>
            {activeConvertAction === "csv-to-geojson" && <CsvToGeoJsonTool key={`csv-to-geojson-${documentKey}`} />}
            {activeConvertAction === "coordinate-converter" && <CoordinateConverterTool key="coordinate-converter" />}
            {activeConvertAction === "utm-zone-finder" && <GeoCalculatorTool key="utm-zone-finder" mode="utm-zone" />}
            {activeConvertAction === "map-tile-calculator" && (
              <GeoCalculatorTool key="map-tile-calculator" mode="tile" />
            )}
            {activeConvertAction === "crs-converter" && <CrsConverterTool key={`crs-converter-${documentKey}`} />}
            {isConversionKind(activeConvertAction) && (
              <GeoConverterTool key={`${activeConvertAction}-${documentKey}`} kind={activeConvertAction} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
