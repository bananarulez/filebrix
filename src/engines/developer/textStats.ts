export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  sentences: number;
  paragraphs: number;
}

export function computeTextStats(text: string): TextStats {
  const trimmed = text.trim();
  return {
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    sentences: trimmed === "" ? 0 : (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.length ?? 0),
    paragraphs: trimmed === "" ? 0 : text.split(/\r?\n\s*\r?\n/).filter((p) => p.trim() !== "").length,
  };
}
