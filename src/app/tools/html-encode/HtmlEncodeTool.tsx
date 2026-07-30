"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { encodeHtmlEntities } from "@/engines/developer/htmlEntities";

export function HtmlEncodeTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="HTML-encoded text"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Encode"
      placeholder="Paste text to encode"
      transform={encodeHtmlEntities}
      toolSlug="html-encode"
    />
  );
}
