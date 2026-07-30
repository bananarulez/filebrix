"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { decodeBase64 } from "@/engines/developer/base64";

export function Base64DecodeTool() {
  return (
    <TextTransformTool
      inputLabel="Base64 input"
      outputLabel="Decoded text"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Decode"
      placeholder="Paste Base64 text to decode"
      transform={decodeBase64}
      toolSlug="base64-decode"
    />
  );
}
