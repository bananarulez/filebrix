import { describe, expect, it } from "vitest";
import { computeTextStats } from "@/engines/developer/textStats";

describe("computeTextStats", () => {
  it("counts words, characters, lines, sentences and paragraphs for a multi-paragraph sample", () => {
    const text = "Hello world. This is FileBrix!\n\nA second paragraph, with two sentences. Here is one.";
    const stats = computeTextStats(text);

    expect(stats.words).toBe(14);
    expect(stats.characters).toBe(text.length);
    expect(stats.charactersNoSpaces).toBe(text.replace(/\s/g, "").length);
    expect(stats.lines).toBe(3);
    expect(stats.sentences).toBe(4);
    expect(stats.paragraphs).toBe(2);
  });

  it("returns all zeros for empty input", () => {
    expect(computeTextStats("")).toEqual({
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      lines: 0,
      sentences: 0,
      paragraphs: 0,
    });
  });

  it("counts a single word with no terminal punctuation as one sentence", () => {
    const stats = computeTextStats("hello");
    expect(stats.words).toBe(1);
    expect(stats.sentences).toBe(1);
    expect(stats.paragraphs).toBe(1);
  });

  it("counts whitespace-only input as zero words but nonzero characters", () => {
    const stats = computeTextStats("   ");
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(3);
    expect(stats.charactersNoSpaces).toBe(0);
  });
});
