"use client";

import { useState } from "react";
import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { RadioOptionGroup } from "@/components/text-tools/RadioOptionGroup";
import { normalizeLineEndings, type LineEnding } from "@/engines/developer/textLines";

const LINE_ENDING_OPTIONS: { value: LineEnding; label: string }[] = [
  { value: "lf", label: "LF (Unix/macOS)" },
  { value: "crlf", label: "CRLF (Windows)" },
  { value: "cr", label: "CR (classic Mac)" },
];

export function NormalizeLineEndingsTool() {
  const [target, setTarget] = useState<LineEnding>("lf");

  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Normalize"
      placeholder="Paste text here"
      transform={(input) => normalizeLineEndings(input, target)}
      toolSlug="normalize-line-endings"
      extraControls={
        <RadioOptionGroup
          legend="Target line ending"
          name="line-ending"
          options={LINE_ENDING_OPTIONS}
          value={target}
          onChange={setTarget}
        />
      }
    />
  );
}
