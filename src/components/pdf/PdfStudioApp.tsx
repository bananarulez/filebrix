"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { PdfPageWorkspaceTool, type WorkspaceMode } from "./PdfPageWorkspaceTool";
import { PdfSplitTool } from "./PdfSplitTool";
import { PdfMetadataTool } from "./PdfMetadataTool";
import { ImagesToPdfTool } from "./ImagesToPdfTool";
import { PdfToImagesTool } from "./PdfToImagesTool";
import { PdfToTextTool } from "./PdfToTextTool";

export type PdfStudioTab = "pages" | "convert" | "metadata" | "security";
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
  { id: "pages", label: "Pages" },
  { id: "convert", label: "Convert" },
  { id: "metadata", label: "Metadata" },
  { id: "security", label: "Security" },
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
 * Pages/Convert/Metadata/Security tab bar always stays switchable, matching how a
 * locked Data Studio tool (e.g. csv-viewer) can still switch modes.
 *
 * No `toolSlug` prop: unlike `SpreadsheetDataApp` (one shared `FileDropZone` across
 * all modes), every sub-component here already owns its own `FileDropZone` with its
 * own hardcoded `toolSlug` matching its individual registry slug — the Universal
 * File Drop handoff for each of the 11 URLs keeps working exactly as before with no
 * new plumbing needed.
 */
export function PdfStudioApp({
  initialTab = "pages",
  lockedPagesAction,
  lockedMetadataMode,
  lockedConvertTool,
}: PdfStudioAppProps) {
  const [tab, setTab] = useState<PdfStudioTab>(initialTab);
  const [pagesAction, setPagesAction] = useState<PagesAction>(lockedPagesAction ?? "merge");
  const [convertTool, setConvertTool] = useState<ConvertTool>(lockedConvertTool ?? "images-to-pdf");
  const [metadataMode, setMetadataMode] = useState<MetadataMode>(lockedMetadataMode ?? "view");

  const activePagesAction = lockedPagesAction ?? pagesAction;
  const activeConvertTool = lockedConvertTool ?? convertTool;
  const activeMetadataMode = lockedMetadataMode ?? metadataMode;

  return (
    <AppShell toolbar={<Toolbar modes={TAB_OPTIONS} activeMode={tab} onModeChange={setTab} />}>
      <div className="flex flex-col gap-4">
        {tab === "pages" && (
          <>
            {!lockedPagesAction && (
              <ActionPicker
                options={PAGES_ACTIONS}
                labels={PAGES_ACTION_LABEL}
                active={activePagesAction}
                onChange={setPagesAction}
              />
            )}
            {activePagesAction === "split" ? (
              <PdfSplitTool key="split" />
            ) : (
              <PdfPageWorkspaceTool key={activePagesAction} mode={activePagesAction} />
            )}
          </>
        )}

        {tab === "convert" && (
          <>
            {!lockedConvertTool && (
              <ActionPicker
                options={CONVERT_TOOLS}
                labels={CONVERT_TOOL_LABEL}
                active={activeConvertTool}
                onChange={setConvertTool}
              />
            )}
            {activeConvertTool === "images-to-pdf" && <ImagesToPdfTool key="images-to-pdf" />}
            {activeConvertTool === "pdf-to-images" && <PdfToImagesTool key="pdf-to-images" />}
            {activeConvertTool === "pdf-to-txt" && <PdfToTextTool key="pdf-to-txt" />}
          </>
        )}

        {tab === "metadata" && (
          <>
            {!lockedMetadataMode && (
              <ActionPicker
                options={METADATA_MODES}
                labels={METADATA_MODE_LABEL}
                active={activeMetadataMode}
                onChange={setMetadataMode}
              />
            )}
            <PdfMetadataTool key={activeMetadataMode} mode={activeMetadataMode} />
          </>
        )}

        {tab === "security" && (
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white">Password protection isn&rsquo;t available yet</p>
            <p>
              Adding a password to a PDF is planned for PDF Studio, but the library this app uses for PDF
              editing doesn&rsquo;t currently support writing password-protected PDFs — only detecting and
              rejecting already-encrypted ones (see the Pages and Metadata tabs). This tab is reserved for
              that feature once it can be built without a new dependency or engine.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
