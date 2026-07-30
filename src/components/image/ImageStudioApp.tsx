"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { ImageTransformTool, type TransformMode } from "./ImageTransformTool";
import { ImageCropTool } from "./ImageCropTool";
import { ImageConvertTool } from "./ImageConvertTool";
import { SvgToPngTool } from "./SvgToPngTool";
import { ImageMetadataTool } from "./ImageMetadataTool";
import { ImageViewerTool } from "./ImageViewerTool";
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


function WatermarkPlaceholder() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      <p className="font-medium text-gray-900 dark:text-white">Watermarking isn&rsquo;t available yet</p>
      <p>
        Adding a text or image watermark is planned for Image Studio. This tab is reserved for that feature —
        nothing is uploaded or processed here.
      </p>
    </div>
  );
}

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
 * No `toolSlug` prop: every sub-component already owns its own `FileDropZone`
 * with its own hardcoded `toolSlug` (or none, for the newly added actions
 * that have no standalone registry entry — see the plan's scoping notes).
 *
 * `editedResult` is lifted here (not in ImageViewerTool) so a single-file
 * Edit-tab result survives switching to the View tab for a before/after
 * compare — see ImageTransformTool/ImageCropTool's `onResult` prop.
 */
export function ImageStudioApp({
  initialTab = "view",
  lockedEditAction,
  lockedConvertPair,
  lockedMetadataMode,
}: ImageStudioAppProps) {
  const [tab, setTab] = useState<ImageStudioTab>(initialTab);
  const [editAction, setEditAction] = useState<EditAction>(lockedEditAction ?? "crop");
  const [convertPair, setConvertPair] = useState<ConvertPair>(lockedConvertPair ?? "png-to-jpg");
  const [metadataMode, setMetadataMode] = useState<MetadataMode>(lockedMetadataMode ?? "view");
  const [editedResult, setEditedResult] = useState<{ sourceFile: File; blob: Blob } | null>(null);

  const activeEditAction = lockedEditAction ?? editAction;
  const activeConvertPair = lockedConvertPair ?? convertPair;
  const activeMetadataMode = lockedMetadataMode ?? metadataMode;
  const convertFormats = CONVERT_PAIR_FORMATS[activeConvertPair];

  function handleEditResult(file: File, blob: Blob) {
    setEditedResult({ sourceFile: file, blob });
  }

  return (
    <AppShell toolbar={<Toolbar modes={TAB_OPTIONS} activeMode={tab} onModeChange={setTab} />}>
      <div className="flex flex-col gap-4">
        {tab === "view" && <ImageViewerTool editedResult={editedResult} />}

        {tab === "edit" && (
          <>
            {!lockedEditAction && (
              <ActionPicker
                options={EDIT_ACTIONS}
                labels={EDIT_ACTION_LABEL}
                active={activeEditAction}
                onChange={setEditAction}
              />
            )}
            {activeEditAction === "crop" && <ImageCropTool key="crop" onResult={handleEditResult} />}
            {activeEditAction === "watermark" && <WatermarkPlaceholder key="watermark" />}
            {isTransformMode(activeEditAction) && (
              <ImageTransformTool key={activeEditAction} mode={activeEditAction} onResult={handleEditResult} />
            )}
          </>
        )}

        {tab === "convert" && (
          <>
            {!lockedConvertPair && (
              <ActionPicker
                options={CONVERT_PAIRS}
                labels={CONVERT_PAIR_LABEL}
                active={activeConvertPair}
                onChange={setConvertPair}
              />
            )}
            {activeConvertPair === "svg-to-png" ? (
              <SvgToPngTool key="svg-to-png" />
            ) : (
              convertFormats && (
                <ImageConvertTool
                  key={activeConvertPair}
                  sourceFormat={convertFormats.source}
                  targetFormat={convertFormats.target}
                />
              )
            )}
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
            <ImageMetadataTool key={activeMetadataMode} mode={activeMetadataMode} />
          </>
        )}
      </div>
    </AppShell>
  );
}
