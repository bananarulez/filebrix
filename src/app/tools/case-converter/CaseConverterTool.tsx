"use client";

import { useState } from "react";
import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { RadioOptionGroup } from "@/components/text-tools/RadioOptionGroup";
import { convertCase, type CaseMode } from "@/engines/developer/caseConvert";

const CASE_OPTIONS: { value: CaseMode; label: string }[] = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
];

export function CaseConverterTool() {
  const [mode, setMode] = useState<CaseMode>("upper");

  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Convert"
      placeholder="Paste text here"
      transform={(input) => convertCase(input, mode)}
      toolSlug="case-converter"
      extraControls={
        <RadioOptionGroup legend="Case" name="case-mode" options={CASE_OPTIONS} value={mode} onChange={setMode} />
      }
    />
  );
}
