import { describe, expect, it } from "vitest";
import { replaceWithRegex, testRegex } from "@/engines/developer/regex";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("regex tester", () => {
  it("returns every match with its offset when global", () => {
    const { matches, truncated } = testRegex("\\d+", "g", "a1 bb22 c333");
    expect(matches.map((m) => m.value)).toEqual(["1", "22", "333"]);
    expect(matches.map((m) => m.index)).toEqual([1, 5, 9]);
    expect(truncated).toBe(false);
  });

  it("returns only the first match when not global", () => {
    const { matches } = testRegex("\\d+", "", "a1 bb22");
    expect(matches.map((m) => m.value)).toEqual(["1"]);
  });

  it("reports numbered and named groups separately", () => {
    // Both views are kept because a named group is also numbered and the
    // runtime exposes no mapping between them — see the interface comment.
    const { matches } = testRegex("(?<year>\\d{4})-(\\d{2})", "", "on 2026-08 ok");
    expect(matches[0].groups).toEqual(["2026", "08"]);
    expect(matches[0].named).toEqual([{ name: "year", value: "2026" }]);
  });

  it("reports an unmatched alternative as undefined rather than dropping it", () => {
    const { matches } = testRegex("(a)|(b)", "", "b");
    expect(matches[0].groups).toEqual([undefined, "b"]);
  });

  it("terminates on a pattern that can match the empty string", () => {
    // The bug this guards: `exec` on a zero-length match doesn't advance
    // lastIndex, so the same match is returned forever and the tab hangs.
    // A test that hangs is indistinguishable from a slow one, so this asserts
    // a specific finite result rather than merely "it returned".
    const { matches, truncated } = testRegex("a*", "g", "aa b");
    expect(truncated).toBe(false);
    expect(matches.length).toBeLessThan(10);
    expect(matches.map((m) => m.value)).toEqual(["aa", "", "", ""]);
  });

  it("terminates on a zero-width assertion", () => {
    const { matches } = testRegex("\\b", "g", "hi there");
    expect(matches.every((m) => m.value === "")).toBe(true);
    expect(matches.length).toBe(4);
  });

  it("caps a runaway match count and says so", () => {
    const { matches, truncated } = testRegex("x", "g", "x".repeat(1500));
    expect(matches).toHaveLength(1000);
    expect(truncated).toBe(true);
  });

  it("rejects an invalid pattern with a specific message", () => {
    expect(() => testRegex("(unclosed", "", "abc")).toThrow(ProcessingError);
    expect(() => testRegex("(unclosed", "", "abc")).toThrow(/isn't a valid regular expression/);
  });

  it("rejects an empty pattern rather than matching everything", () => {
    expect(() => testRegex("", "g", "abc")).toThrow(/Enter a pattern/);
  });

  describe("replace", () => {
    it("supports $1 and $<name> exactly as String.replace does", () => {
      expect(replaceWithRegex("(\\w+)@(\\w+)", "g", "a@b c@d", "$2:$1")).toBe("b:a d:c");
      expect(replaceWithRegex("(?<n>\\d+)", "g", "id 42", "#$<n>")).toBe("id #42");
    });

    it("replaces once without the global flag, even though matching forces it internally", () => {
      // compile() adds `g` so a single exec loop can find everything; replace
      // must not inherit that, or clearing the Global checkbox would silently
      // do nothing here.
      expect(replaceWithRegex("a", "", "aaa", "-")).toBe("-aa");
      expect(replaceWithRegex("a", "g", "aaa", "-")).toBe("---");
    });
  });
});
