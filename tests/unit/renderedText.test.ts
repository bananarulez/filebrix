import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const OUT = path.resolve(__dirname, "..", "..", "out");

/**
 * Catches words fused together in the rendered HTML — "itselfunless",
 * "FileBrixdoes", "neverincluded".
 *
 * A space written in JSX between an element (or an expression) and the text
 * after it does not reliably survive the build: six of them were silently
 * dropped and shipped, and a reader spotted them on the live site. `tsc`,
 * lint, 790 unit tests and 338 e2e tests were all green — nothing checks
 * prose, and the source looked correct, because the space *was* there.
 *
 * The fix at each site is an explicit `{" "}`, which can't be trimmed. This
 * test is what stops the next paragraph from re-introducing it, and it works
 * on the **built output** rather than the source, since the source is exactly
 * where the bug is invisible.
 *
 * `out/` is a build artifact, so this skips when it hasn't been generated. CI
 * builds before running tests, so it runs there.
 */

/** Every generated HTML file, recursively. */
function htmlFiles(dir = OUT): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

/**
 * Two ways two pieces of text end up with no space between them:
 *
 *  - `</strong>word` — an inline element followed immediately by a letter.
 *  - `word<!-- -->word` — React's separator between two adjacent text nodes,
 *    which is invisible when rendered. It is only a bug when neither side has
 *    a space; `FileBrix<!-- --> sets no cookies` is perfectly normal.
 */
const FUSED = /<\/(?:strong|em|b|i|a|code|abbr|span)>[A-Za-z]|[A-Za-z]<!-- -->[A-Za-z]/g;

describe("rendered prose", () => {
  const built = existsSync(OUT);

  it.skipIf(!built)("never fuses two words together", () => {
    const offenders: string[] = [];

    for (const file of htmlFiles()) {
      const html = readFileSync(file, "utf8");
      for (const match of html.matchAll(FUSED)) {
        // A little context, tags stripped, so a failure names the sentence
        // rather than a byte offset.
        const around = html
          .slice(Math.max(0, match.index - 55), match.index + 45)
          .replace(/<!-- -->/g, "")
          .replace(/<[^>]*>/g, "");
        offenders.push(`${path.relative(OUT, file)}: …${around}…`);
      }
    }

    expect(offenders, `Missing space in rendered text — use {" "} at the join:\n${offenders.join("\n")}`).toEqual([]);
  });
});
