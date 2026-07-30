"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { escapeUnicode } from "@/engines/developer/unicodeEscape";

export function UnicodeEscapeTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Escaped text"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Escape"
      placeholder="Paste text to escape"
      transform={escapeUnicode}
      toolSlug="unicode-escape"
    />
  );
}
