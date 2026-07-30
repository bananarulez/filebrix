"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { decodeHtmlEntities } from "@/engines/developer/htmlEntities";

export function HtmlDecodeTool() {
  return (
    <TextTransformTool
      inputLabel="HTML-encoded text"
      outputLabel="Decoded text"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Decode"
      placeholder="Paste HTML-encoded text to decode"
      transform={decodeHtmlEntities}
      toolSlug="html-decode"
    />
  );
}
