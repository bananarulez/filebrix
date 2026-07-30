"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { unescapeUnicode } from "@/engines/developer/unicodeEscape";

export function UnicodeUnescapeTool() {
  return (
    <TextTransformTool
      inputLabel="Escaped text"
      outputLabel="Decoded text"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Unescape"
      placeholder="Paste \uXXXX-escaped text to decode"
      transform={unescapeUnicode}
      toolSlug="unicode-unescape"
    />
  );
}
