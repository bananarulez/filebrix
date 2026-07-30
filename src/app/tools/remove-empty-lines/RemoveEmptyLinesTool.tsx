"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { removeEmptyLines } from "@/engines/developer/textLines";

export function RemoveEmptyLinesTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Remove empty lines"
      placeholder="Paste text here"
      transform={removeEmptyLines}
      toolSlug="remove-empty-lines"
    />
  );
}
