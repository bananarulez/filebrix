"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { encodeUrlText } from "@/engines/developer/urlEncoding";

export function UrlEncodeTool() {
  return (
    <TextTransformTool
      inputLabel="Text input"
      outputLabel="URL-encoded output"
      acceptFileExtension="*"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Encode"
      placeholder="Paste text or a URL component to encode"
      transform={encodeUrlText}
      toolSlug="url-encode"
    />
  );
}
