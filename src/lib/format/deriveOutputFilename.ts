/** Swaps a filename's extension for the output format's — "data.csv" + "xlsx" -> "data.xlsx". */
export function deriveOutputFilename(originalName: string, outputExtension: string): string {
  const base = originalName.replace(/\.[^./]+$/, "");
  return `${base || "download"}.${outputExtension}`;
}
