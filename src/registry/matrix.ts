import type { FileFormat, ToolDefinition } from "./types";
import { tools as registryTools } from "./index";

export type ConversionMatrix = Map<FileFormat, Map<FileFormat, ToolDefinition[]>>;

/**
 * Derives the from -> to conversion matrix straight from the registry's
 * acceptedFileTypes/outputFileTypes, so it can never drift from what tools
 * actually exist (see README.txt §46 — no hand-maintained parallel list).
 */
export function buildConversionMatrix(toolList: ToolDefinition[]): ConversionMatrix {
  const matrix: ConversionMatrix = new Map();
  for (const tool of toolList) {
    for (const from of tool.acceptedFileTypes) {
      for (const to of tool.outputFileTypes) {
        if (from === to) continue;
        if (!matrix.has(from)) matrix.set(from, new Map());
        const targets = matrix.get(from)!;
        if (!targets.has(to)) targets.set(to, []);
        targets.get(to)!.push(tool);
      }
    }
  }
  return matrix;
}

export const conversionMatrix = buildConversionMatrix(registryTools);

export function getSupportedOutputs(
  matrix: ConversionMatrix,
  from: FileFormat
): FileFormat[] {
  return Array.from(matrix.get(from)?.keys() ?? []);
}

export function getToolsForConversion(
  matrix: ConversionMatrix,
  from: FileFormat,
  to: FileFormat
): ToolDefinition[] {
  return matrix.get(from)?.get(to) ?? [];
}
