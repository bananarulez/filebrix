"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { reverseLines } from "@/engines/developer/textLines";

export function ReverseLinesTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Reverse lines"
      placeholder="Paste text here"
      transform={reverseLines}
      toolSlug="reverse-lines"
    />
  );
}
