"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { encodeBase64 } from "@/engines/developer/base64";

export function Base64EncodeTool() {
  return (
    <TextTransformTool
      inputLabel="Text input"
      outputLabel="Base64 output"
      acceptFileExtension="*"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Encode"
      placeholder="Paste text to encode"
      transform={encodeBase64}
      toolSlug="base64-encode"
    />
  );
}
