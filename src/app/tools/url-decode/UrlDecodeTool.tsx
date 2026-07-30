"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { decodeUrlText } from "@/engines/developer/urlEncoding";

export function UrlDecodeTool() {
  return (
    <TextTransformTool
      inputLabel="URL-encoded input"
      outputLabel="Decoded text"
      acceptFileExtension="*"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Decode"
      placeholder="Paste URL-encoded text to decode"
      transform={decodeUrlText}
      toolSlug="url-decode"
    />
  );
}
