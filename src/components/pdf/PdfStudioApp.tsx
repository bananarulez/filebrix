"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { studioTabId } from "@/components/app-shell/tabIds";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { PdfPageWorkspaceTool, TOOL_SLUG_BY_MODE, type WorkspaceMode } from "./PdfPageWorkspaceTool";
import { PdfSplitTool } from "./PdfSplitTool";
import { PdfMetadataTool } from "./PdfMetadataTool";
import { ImagesToPdfTool } from "./ImagesToPdfTool";
import { PdfToImagesTool } from "./PdfToImagesTool";
import { PdfToTextTool } from "./PdfToTextTool";
import { PdfViewerTool } from "./PdfViewerTool";
import { PdfFilePanel, PdfWorkspace, usePdfWorkspace } from "./PdfWorkspace";

export type PdfStudioTab = "view" | "pages" | "convert" | "metadata";
export type PagesAction = WorkspaceMode | "split";
export type ConvertTool = "images-to-pdf" | "pdf-to-images" | "pdf-to-txt";
export type MetadataMode = "view" | "remove";

interface PdfStudioAppProps {
  initialTab?: PdfStudioTab;
  /** Hides the Pages action picker, showing only this one — used by every old
   * /pdf/{merge,split,extract-pages,delete-pages,reorder-pages,rotate} URL so its
   * SEO promise stays true. The top-level tab bar stays switchable regardless. */
  lockedPagesAction?: PagesAction;
  /** Hides the Metadata view/remove picker — used by metadata-viewer/remove-metadata. */
  lockedMetadataMode?: MetadataMode;
  /** Hides the Convert tool picker — used by images-to-pdf/pdf-to-images/pdf-to-txt. */
  lockedConvertTool?: ConvertTool;
}

const TAB_OPTIONS: ToolbarModeOption<PdfStudioTab>[] = [
  { id: "view", label: "View" },
  { id: "pages", label: "Pages" },
  { id: "convert", label: "Convert" },
  { id: "metadata", label: "Metadata" },
];

const PAGES_ACTIONS: PagesAction[] = ["merge", "split", "extract", "delete", "reorder", "rotate"];
const PAGES_ACTION_LABEL: Record<PagesAction, string> = {
  merge: "Merge",
  split: "Split",
  extract: "Extract",
  delete: "Delete",
  reorder: "Reorder",
  rotate: "Rotate",
};

const CONVERT_TOOLS: ConvertTool[] = ["images-to-pdf", "pdf-to-images", "pdf-to-txt"];
const CONVERT_TOOL_LABEL: Record<ConvertTool, string> = {
  "images-to-pdf": "Images to PDF",
  "pdf-to-images": "PDF to Images",
  "pdf-to-txt": "PDF to Text",
};

const METADATA_MODES: MetadataMode[] = ["view", "remove"];
const METADATA_MODE_LABEL: Record<MetadataMode, string> = {
  view: "View",
  remove: "Remove",
};

/**
 * Images to PDF is the one action here whose input isn't a PDF — it takes
 * N images and owns its own drop zone, so the shared PDF drop zone is
 * hidden for it. Same rule Data Studio applies to its paste-first actions
 * and Geospatial Studio to its coordinate converter.
 */
function actionNeedsPdf(tab: PdfStudioTab, convertTool: ConvertTool): boolean {
  if (tab === "convert") return convertTool !== "images-to-pdf";
  return true;
}

/** The registry slug of whatever tool is active, for the Universal File Drop handoff (CLAUDE.md rule 9). */
function activeToolSlug(
  tab: PdfStudioTab,
  pagesAction: PagesAction,
  convertTool: ConvertTool,
  metadataMode: MetadataMode
): string | undefined {
  if (tab === "pages") return pagesAction === "split" ? "split" : TOOL_SLUG_BY_MODE[pagesAction];
  if (tab === "convert") return convertTool;
  if (tab === "metadata") return metadataMode === "view" ? "metadata-viewer" : "remove-metadata";
  // View has no standalone tool page of its own.
  return undefined;
}

/**
 * One shared shell hosting all 11 existing PDF tools, every one of them reused
 * unchanged, via lightweight action pickers rather than one component forced to
 * render six different layouts. `PdfPageWorkspaceTool` (merge/extract/delete/
 * reorder/rotate) and `PdfSplitTool` have genuinely different selection UIs — per-
 * page checkbox/move/rotate vs. a between-pages marker toggle — so Pages hosts both
 * side by side instead of merging them into one. Same reasoning for Convert's three
 * tools (different input shapes: N images, one PDF, one PDF) and Metadata's two
 * modes (already unified upstream via `PdfMetadataTool`'s own `mode` prop, reused
 * as-is here).
 *
 * Every `lockedX` prop hides only the sub-picker for that one tab — the top-level
 * View/Pages/Convert/Metadata tab bar always stays switchable, matching how
 * a locked Data Studio tool (e.g. csv-viewer) can still switch modes.
 *
 * The loaded PDF lives in `PdfWorkspace`, not in each tool, so switching tabs — or
 * Pages actions, e.g. Merge to Split — keeps it. See that file for why.
 */
export function PdfStudioApp(props: PdfStudioAppProps) {
  return (
    <PdfWorkspace>
      <PdfStudioBody {...props} />
    </PdfWorkspace>
  );
}

function PdfStudioBody({
  initialTab = "pages",
  lockedPagesAction,
  lockedMetadataMode,
  lockedConvertTool,
}: PdfStudioAppProps) {
  const { documentKey } = usePdfWorkspace();
  const [tab, setTab] = useState<PdfStudioTab>(initialTab);
  const [pagesAction, setPagesAction] = useState<PagesAction>(lockedPagesAction ?? "merge");
  const [convertTool, setConvertTool] = useState<ConvertTool>(lockedConvertTool ?? "images-to-pdf");
  const [metadataMode, setMetadataMode] = useState<MetadataMode>(lockedMetadataMode ?? "view");

  const activePagesAction = lockedPagesAction ?? pagesAction;
  const activeConvertTool = lockedConvertTool ?? convertTool;
  const activeMetadataMode = lockedMetadataMode ?? metadataMode;

  return (
    <AppShell activeTabId={studioTabId(tab)} toolbar={<Toolbar modes={TAB_OPTIONS} activeMode={tab} onModeChange={setTab} />}>
      {/* Order matches the other three Studios: tab bar (in the shell's own
       * toolbar slot) -> action picker -> drop zone -> the tool's own UI. */}
      <div className="flex flex-col gap-4">
        {tab === "pages" && !lockedPagesAction && (
          <ActionPicker
            options={PAGES_ACTIONS}
            labels={PAGES_ACTION_LABEL}
            active={activePagesAction}
            onChange={setPagesAction}
          />
        )}
        {tab === "convert" && !lockedConvertTool && (
          <ActionPicker
            options={CONVERT_TOOLS}
            labels={CONVERT_TOOL_LABEL}
            active={activeConvertTool}
            onChange={setConvertTool}
          />
        )}
        {tab === "metadata" && !lockedMetadataMode && (
          <ActionPicker
            options={METADATA_MODES}
            labels={METADATA_MODE_LABEL}
            active={activeMetadataMode}
            onChange={setMetadataMode}
          />
        )}

        {actionNeedsPdf(tab, activeConvertTool) && (
          <PdfFilePanel
            // Merge is the one action that takes several PDFs and appends
            // them rather than replacing what's loaded.
            multiple={tab === "pages" && activePagesAction === "merge"}
            toolSlug={activeToolSlug(tab, activePagesAction, activeConvertTool, activeMetadataMode)}
          />
        )}

        {tab === "view" && <PdfViewerTool key={`view-${documentKey}`} />}

        {tab === "pages" &&
          (activePagesAction === "split" ? (
            <PdfSplitTool key={`split-${documentKey}`} />
          ) : (
            <PdfPageWorkspaceTool key={activePagesAction} mode={activePagesAction} />
          ))}

        {tab === "convert" && (
          <>
            {activeConvertTool === "images-to-pdf" && <ImagesToPdfTool key="images-to-pdf" />}
            {activeConvertTool === "pdf-to-images" && <PdfToImagesTool key={`pdf-to-images-${documentKey}`} />}
            {activeConvertTool === "pdf-to-txt" && <PdfToTextTool key={`pdf-to-txt-${documentKey}`} />}
          </>
        )}

        {tab === "metadata" && (
          <PdfMetadataTool key={`${activeMetadataMode}-${documentKey}`} mode={activeMetadataMode} />
        )}

      </div>
    </AppShell>
  );
}
