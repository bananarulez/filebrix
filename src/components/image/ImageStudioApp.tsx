"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { studioTabId } from "@/components/app-shell/tabIds";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { ImageTransformTool, type TransformMode } from "./ImageTransformTool";
import { ImageCropTool } from "./ImageCropTool";
import { ImageWatermarkTool } from "./ImageWatermarkTool";
import { ImageConvertTool } from "./ImageConvertTool";
import { SvgToPngTool } from "./SvgToPngTool";
import { ImageMetadataTool } from "./ImageMetadataTool";
import { ImageViewerTool } from "./ImageViewerTool";
import { ImageFilePanel, ImageWorkspace, useImageWorkspace } from "./ImageWorkspace";
import {
  ACTION_FORMATS,
  acceptFor,
  actionAcceptsMultiple,
  actionNeedsFile,
  buildDisabledReasons,
} from "./actionFormats";
import type { RasterFormat } from "@/engines/image";

export type ImageStudioTab = "view" | "edit" | "convert" | "metadata";
export type EditAction = TransformMode | "crop" | "watermark";
export type ConvertPair =
  | "png-to-jpg"
  | "jpg-to-png"
  | "webp-to-jpg"
  | "jpg-to-webp"
  | "png-to-webp"
  | "webp-to-png"
  | "svg-to-png";
export type MetadataMode = "view" | "remove";

interface ImageStudioAppProps {
  initialTab?: ImageStudioTab;
  /** Hides the Edit action picker — used by every old
   * /tools/{resize,compress,rotate,flip}-image URL so its SEO promise stays
   * true. The top-level tab bar stays switchable regardless. */
  lockedEditAction?: EditAction;
  /** Hides the Convert pair picker — used by all 7 old /convert/* URLs. */
  lockedConvertPair?: ConvertPair;
  /** Hides the Metadata view/remove picker — used by image-metadata-viewer/
   * remove-image-metadata, mirroring PDF Studio's own Metadata tab. */
  lockedMetadataMode?: MetadataMode;
}

const TAB_OPTIONS: ToolbarModeOption<ImageStudioTab>[] = [
  { id: "view", label: "View" },
  { id: "edit", label: "Edit" },
  { id: "convert", label: "Convert" },
  { id: "metadata", label: "Metadata" },
];

const TRANSFORM_ACTIONS: TransformMode[] = [
  "resize",
  "compress",
  "rotate",
  "flip",
  "brightness",
  "contrast",
  "grayscale",
];

function isTransformMode(action: EditAction): action is TransformMode {
  return (TRANSFORM_ACTIONS as EditAction[]).includes(action);
}

const EDIT_ACTIONS: EditAction[] = [
  "crop",
  "resize",
  "compress",
  "rotate",
  "flip",
  "brightness",
  "contrast",
  "grayscale",
  "watermark",
];
const EDIT_ACTION_LABEL: Record<EditAction, string> = {
  crop: "Crop",
  resize: "Resize",
  compress: "Compress",
  rotate: "Rotate",
  flip: "Flip",
  brightness: "Brightness",
  contrast: "Contrast",
  grayscale: "Grayscale",
  watermark: "Watermark",
};

const METADATA_MODES: MetadataMode[] = ["view", "remove"];
const METADATA_MODE_LABEL: Record<MetadataMode, string> = {
  view: "View",
  remove: "Remove",
};

const CONVERT_PAIRS: ConvertPair[] = [
  "png-to-jpg",
  "jpg-to-png",
  "webp-to-jpg",
  "jpg-to-webp",
  "png-to-webp",
  "webp-to-png",
  "svg-to-png",
];
const CONVERT_PAIR_LABEL: Record<ConvertPair, string> = {
  "png-to-jpg": "PNG to JPG",
  "jpg-to-png": "JPG to PNG",
  "webp-to-jpg": "WebP to JPG",
  "jpg-to-webp": "JPG to WebP",
  "png-to-webp": "PNG to WebP",
  "webp-to-png": "WebP to PNG",
  "svg-to-png": "SVG to PNG",
};
/** No entry for "svg-to-png" — it's rendered by the separate SvgToPngTool
 * instead, since the raster pipeline (RasterFormat) never accepted SVG. */
const CONVERT_PAIR_FORMATS: Partial<Record<ConvertPair, { source: RasterFormat; target: RasterFormat }>> = {
  "png-to-jpg": { source: "png", target: "jpg" },
  "jpg-to-png": { source: "jpg", target: "png" },
  "webp-to-jpg": { source: "webp", target: "jpg" },
  "jpg-to-webp": { source: "jpg", target: "webp" },
  "png-to-webp": { source: "png", target: "webp" },
  "webp-to-png": { source: "webp", target: "png" },
};


/**
 * One shared shell hosting all 13 existing image tools, every one of them
 * reused unchanged (plus two genuinely new ones, Crop and the Viewer), via
 * lightweight action pickers rather than one component forced to render ten
 * different layouts. `ImageTransformTool` already covers resize/compress/
 * rotate/flip and was widened (not forked) to also cover brightness/
 * contrast/grayscale, since all seven are the same "numeric input, snapshot
 * on click" shape; Crop needed its own component because it's the one Edit
 * action that requires seeing the image before choosing options.
 *
 * Metadata (View/Remove) lives entirely in its own tab, via a
 * `MetadataMode` picker — mirroring `PdfStudioApp`'s Metadata tab exactly
 * (`ImageMetadataTool` already took a `mode: "view" | "remove"` prop, same
 * shape as `PdfMetadataTool`, so this was a placement fix, not new
 * capability). "Remove Metadata" previously lived as one of ten options in
 * the Edit tab's action picker, mixed in among pixel-level transforms
 * (resize/crop/rotate/...) it has nothing to do with — inconsistent with
 * PDF Studio's own Metadata tab, and easy to miss since a user looking to
 * strip EXIF data would naturally check a "Metadata" tab first, not scroll
 * through Edit's options. See PROJECT_LOG.md's Studio UX review entry.
 *
 * Every `lockedX` prop hides only the sub-picker for that one tab — the
 * top-level View/Edit/Convert/Metadata tab bar always stays switchable,
 * matching how a locked Data/PDF Studio tool can still switch modes.
 *
 * The loaded images live in `ImageWorkspace`, not in each tool, so switching
 * tabs — or Edit actions, e.g. Resize to Rotate — keeps them. See that file
 * for why, and `actionFormats.ts` for how an action a loaded image can't
 * support is disabled rather than mounted.
 *
 * `editedResult` is lifted here (not in ImageViewerTool) so a single-file
 * Edit-tab result survives switching to the View tab for a before/after
 * compare — see ImageTransformTool/ImageCropTool's `onResult` prop.
 */
export function ImageStudioApp(props: ImageStudioAppProps) {
  // A locked page may only adopt a carried-over file its one action can
  // actually process — /convert/png-to-jpg must not silently pick up a JPEG.
  // The Studio hub passes nothing: its picker re-gates to whatever is loaded.
  const locked = props.lockedEditAction ?? props.lockedConvertPair ?? props.lockedMetadataMode;
  const acceptFormats = locked ? (ACTION_FORMATS[locked] ?? undefined) : undefined;

  return (
    <ImageWorkspace acceptFormats={acceptFormats}>
      <ImageStudioBody {...props} />
    </ImageWorkspace>
  );
}

/** The registry slug of whatever tool is active, for the Universal File Drop handoff (CLAUDE.md rule 9). */
function activeToolSlug(
  tab: ImageStudioTab,
  editAction: EditAction,
  convertPair: ConvertPair,
  metadataMode: MetadataMode
): string | undefined {
  // Crop and Watermark have no standalone tool page, and neither does View.
  if (tab === "edit") return isTransformMode(editAction) ? `${editAction}-image` : undefined;
  if (tab === "convert") return convertPair;
  if (tab === "metadata") return metadataMode === "view" ? "image-metadata-viewer" : "remove-image-metadata";
  return undefined;
}

function ImageStudioBody({
  initialTab = "view",
  lockedEditAction,
  lockedConvertPair,
  lockedMetadataMode,
}: ImageStudioAppProps) {
  const { commonFormat, documentKey } = useImageWorkspace();
  const [tab, setTab] = useState<ImageStudioTab>(initialTab);
  const [editAction, setEditAction] = useState<EditAction>(lockedEditAction ?? "crop");
  const [convertPair, setConvertPair] = useState<ConvertPair>(lockedConvertPair ?? "png-to-jpg");
  const [metadataMode, setMetadataMode] = useState<MetadataMode>(lockedMetadataMode ?? "view");
  const [editedResult, setEditedResult] = useState<{ sourceFile: File; blob: Blob } | null>(null);

  const editDisabled = buildDisabledReasons(EDIT_ACTIONS, commonFormat);
  const convertDisabled = buildDisabledReasons(CONVERT_PAIRS, commonFormat);
  const metadataDisabled = buildDisabledReasons(METADATA_MODES, commonFormat);

  /**
   * If the loaded images' format rules out the action the user had selected,
   * fall back to the first one it *does* support rather than mounting a tool
   * that can't run — the same rule Geospatial Studio applies. A locked action
   * is never overridden: that page promised one specific tool.
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

  const activeEditAction = resolve(lockedEditAction, editAction, EDIT_ACTIONS, editDisabled);
  const activeConvertPair = resolve(lockedConvertPair, convertPair, CONVERT_PAIRS, convertDisabled);
  const activeMetadataMode = resolve(lockedMetadataMode, metadataMode, METADATA_MODES, metadataDisabled);
  const convertFormats = CONVERT_PAIR_FORMATS[activeConvertPair];

  /**
   * View has no action picker (it never had one), so its "action" for
   * drop-zone purposes is the whole accepted set — every other tab's active
   * action decides whether a drop zone shows at all, how many files it
   * takes, and what it filters for.
   */
  const activeAction =
    tab === "view"
      ? null
      : tab === "edit"
        ? activeEditAction
        : tab === "convert"
          ? activeConvertPair
          : activeMetadataMode;

  /**
   * The drop zone's file-picker filter is narrowed to the active action's own
   * formats **only on a locked tool page**, where that one action is the
   * whole point of the URL. On the Studio itself it deliberately stays the
   * full accepted set: narrowing it there would make an action the current
   * file rules out unreachable — with a PNG loaded, "SVG to PNG" is disabled
   * *and* the picker wouldn't let you choose the SVG that would re-enable it,
   * so the only way out would be Clear. Geospatial Studio's one accept string
   * works the same way for the same reason.
   */
  const lockedActiveAction =
    tab === "edit"
      ? lockedEditAction
      : tab === "convert"
        ? lockedConvertPair
        : tab === "metadata"
          ? lockedMetadataMode
          : undefined;

  function handleEditResult(file: File, blob: Blob) {
    setEditedResult({ sourceFile: file, blob });
  }

  return (
    <AppShell activeTabId={studioTabId(tab)} toolbar={<Toolbar modes={TAB_OPTIONS} activeMode={tab} onModeChange={setTab} />}>
      {/* Order matches the other three Studios: tab bar (in the shell's own
       * toolbar slot) -> action picker -> drop zone -> the tool's own UI. */}
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
        {tab === "convert" && !lockedConvertPair && (
          <ActionPicker
            options={CONVERT_PAIRS}
            labels={CONVERT_PAIR_LABEL}
            disabledReasons={convertDisabled}
            active={activeConvertPair}
            onChange={setConvertPair}
          />
        )}
        {tab === "metadata" && !lockedMetadataMode && (
          <ActionPicker
            options={METADATA_MODES}
            labels={METADATA_MODE_LABEL}
            disabledReasons={metadataDisabled}
            active={activeMetadataMode}
            onChange={setMetadataMode}
          />
        )}

        {(activeAction === null || actionNeedsFile(activeAction)) && (
          <ImageFilePanel
            multiple={activeAction === null || actionAcceptsMultiple(activeAction)}
            accept={lockedActiveAction ? acceptFor(lockedActiveAction) : undefined}
            toolSlug={activeToolSlug(tab, activeEditAction, activeConvertPair, activeMetadataMode)}
          />
        )}

        {tab === "view" && <ImageViewerTool key={`view-${documentKey}`} editedResult={editedResult} />}

        {tab === "edit" && (
          <>
            {activeEditAction === "crop" && (
              <ImageCropTool key={`crop-${documentKey}`} onResult={handleEditResult} />
            )}
            {activeEditAction === "watermark" && (
              <ImageWatermarkTool key={`watermark-${documentKey}`} onResult={handleEditResult} />
            )}
            {isTransformMode(activeEditAction) && (
              <ImageTransformTool
                key={`${activeEditAction}-${documentKey}`}
                mode={activeEditAction}
                onResult={handleEditResult}
              />
            )}
          </>
        )}

        {tab === "convert" &&
          (activeConvertPair === "svg-to-png" ? (
            <SvgToPngTool key={`svg-to-png-${documentKey}`} />
          ) : (
            convertFormats && (
              <ImageConvertTool
                key={`${activeConvertPair}-${documentKey}`}
                sourceFormat={convertFormats.source}
                targetFormat={convertFormats.target}
              />
            )
          ))}

        {tab === "metadata" && (
          <ImageMetadataTool key={`${activeMetadataMode}-${documentKey}`} mode={activeMetadataMode} />
        )}
      </div>
    </AppShell>
  );
}
