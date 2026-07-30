"use client";

import { useState } from "react";
import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { RadioOptionGroup } from "@/components/text-tools/RadioOptionGroup";
import { sortLines, type SortDirection } from "@/engines/developer/textLines";

const DIRECTION_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: "asc", label: "A → Z" },
  { value: "desc", label: "Z → A" },
];

export function SortLinesTool() {
  const [direction, setDirection] = useState<SortDirection>("asc");

  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Sort lines"
      placeholder="Paste text here"
      transform={(input) => sortLines(input, direction)}
      toolSlug="sort-lines"
      extraControls={
        <RadioOptionGroup
          legend="Sort order"
          name="sort-direction"
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={setDirection}
        />
      }
    />
  );
}
