"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDropZone } from "./FileDropZone";
import { FileInfo } from "./FileInfo";
import { LocalProcessingBadge } from "./LocalProcessingBadge";
import { detectFileType, tryDecodeAsText, type DetectedFile } from "@/lib/detect/detectFile";
import { describeDetectedFormat } from "@/lib/detect/formatLabels";
import {
  categorizeActions,
  GENERIC_TEXT_TOOL_SLUGS,
  hasAnyActions,
  type CategorizedActions,
} from "@/lib/detect/categorizeActions";
import { setPendingFile } from "@/lib/fileHandoff";
import { getToolBySlug, getToolsAcceptingFormat, getToolUrl } from "@/registry";
import type { ToolDefinition } from "@/registry/types";

/** Only the first 512 bytes are needed to tell text from binary — matches detectFileType's own read window. */
const SNIFF_BYTES = 512;

const SECTION_LABELS: Record<keyof CategorizedActions, string> = {
  view: "View",
  convert: "Convert",
  edit: "Edit",
  utility: "Tools",
};

function ActionSection({ title, tools, file }: { title: string; tools: ToolDefinition[]; file: File }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <ul className="flex flex-col gap-1">
        {tools.map((tool) => (
          <li key={tool.id}>
            {/* Handing off the file on click (not just navigating) is what lets
                the destination tool skip asking the user to re-select it —
                see lib/fileHandoff.ts. */}
            <Link
              href={getToolUrl(tool)}
              onClick={() => setPendingFile(tool.slug, file)}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {tool.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UniversalFileDrop() {
  const [file, setFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<DetectedFile | null>(null);
  const [unknownFileLooksLikeText, setUnknownFileLooksLikeText] = useState(false);

  async function handleFiles(files: File[]) {
    const [selected] = files;
    if (!selected) return;

    setFile(selected);
    const result = await detectFileType(selected);
    setDetected(result);

    if (result.format === "unknown") {
      const head = new Uint8Array(await selected.slice(0, SNIFF_BYTES).arrayBuffer());
      setUnknownFileLooksLikeText(tryDecodeAsText(head) !== null);
    } else {
      setUnknownFileLooksLikeText(false);
    }
  }

  function handleClear() {
    setFile(null);
    setDetected(null);
    setUnknownFileLooksLikeText(false);
  }

  const matchingTools = detected && detected.format !== "unknown" ? getToolsAcceptingFormat(detected.format) : [];
  const actions = categorizeActions(matchingTools);
  const genericTextTools = unknownFileLooksLikeText
    ? GENERIC_TEXT_TOOL_SLUGS.map((slug) => getToolBySlug(slug)).filter((tool): tool is ToolDefinition =>
        Boolean(tool)
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label="Drop any file"
        hint="We'll show you what you can do with it. Nothing is uploaded."
        onFilesSelected={handleFiles}
      />

      {file && detected && (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FileInfo file={file} detectedFormat={detected.format === "unknown" ? undefined : detected.format} />
            <div className="flex items-center gap-3">
              <LocalProcessingBadge />
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Detected:{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {describeDetectedFormat(detected.format)}
            </span>
          </p>

          {detected.format === "unknown" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We don&apos;t have a tool for this file type yet.
              </p>
              {genericTextTools.length > 0 && (
                <ActionSection title="This looks like text — you could also try" tools={genericTextTools} file={file} />
              )}
            </div>
          ) : hasAnyActions(actions) ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ActionSection title={SECTION_LABELS.view} tools={actions.view} file={file} />
              <ActionSection title={SECTION_LABELS.convert} tools={actions.convert} file={file} />
              <ActionSection title={SECTION_LABELS.edit} tools={actions.edit} file={file} />
              <ActionSection title={SECTION_LABELS.utility} tools={actions.utility} file={file} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              We recognize this file type, but there&apos;s no tool for it yet — check back soon as we expand the
              toolbox.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
