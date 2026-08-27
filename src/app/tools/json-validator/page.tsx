import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "json-validator";

const HOW_IT_WORKS_STEPS = [
  "Paste JSON, or open a .json file.",
  "Click Validate.",
  "A specific parse error is shown if the JSON is invalid; otherwise you'll see a confirmation.",
];

const TRAILING_COMMA = `{ "a": 1, "b": 2, }     invalid
{ "a": 1, "b": 2 }      valid`;

const SINGLE_QUOTES = `{ 'name': 'Ada' }       invalid
{ "name": "Ada" }       valid`;

const UNQUOTED_KEYS = `{ name: "Ada" }         invalid
{ "name": "Ada" }       valid`;

const RAW_NEWLINE = `{ "note": "line one
line two" }                        invalid

{ "note": "line one\\nline two" }   valid`;

/**
 * One of the few tool pages carrying a `ToolArticle`. Search data showed the
 * queries reaching this page are overwhelmingly diagnostic — "json checker",
 * "json verify", "check json validity" — i.e. people who already have a
 * document that will not parse and want to know why. The tool answers that
 * for their file; this answers it for the general case, which is the part
 * worth linking to.
 */
const ARTICLE = (
  <>
    <h2>What &ldquo;invalid JSON&rdquo; actually means</h2>
    <p>
      JSON is a deliberately small, strict format. A parser reads the whole document or rejects all
      of it — there is no partial success and no tolerant mode. So a single stray character
      thousands of lines in makes the entire file unusable, which is why the position in the error
      message matters as much as the message itself.
    </p>
    <p>
      Validating here means checking that the document <em>parses</em>. That is a different question
      from whether it contains what your application expects, which is covered further down.
    </p>

    <h2>The eight things that actually break JSON</h2>
    <p>
      In practice almost every parse failure is one of these. The first four are all cases of
      JavaScript being more forgiving than JSON.
    </p>

    <h3>1. A trailing comma</h3>
    <p>The most common one by a wide margin. JSON allows no comma after the final item.</p>
    <pre>
      <code>{TRAILING_COMMA}</code>
    </pre>

    <h3>2. Single quotes</h3>
    <p>JSON strings and keys use double quotes only. Single quotes are a JavaScript habit.</p>
    <pre>
      <code>{SINGLE_QUOTES}</code>
    </pre>

    <h3>3. Unquoted keys</h3>
    <p>Every key is a quoted string, even when it looks like a plain identifier.</p>
    <pre>
      <code>{UNQUOTED_KEYS}</code>
    </pre>

    <h3>4. Comments</h3>
    <p>
      JSON has no comments of any kind. Both <code>{"//"}</code> and <code>{"/* */"}</code> are
      rejected.
      This surprises people whose editor accepts them — see the note on JSONC below.
    </p>

    <h3>5. Unescaped characters inside a string</h3>
    <p>
      A literal newline, tab or double quote cannot appear raw inside a JSON string; it has to be
      escaped. This is the one that bites when a value was built by concatenating text.
    </p>
    <pre>
      <code>{RAW_NEWLINE}</code>
    </pre>

    <h3>6. A missing or mismatched bracket</h3>
    <p>
      Usually reported at the very end of the file rather than where the problem is, because the
      parser only discovers the imbalance when it runs out of input. If the error points at the last
      character, suspect this.
    </p>

    <h3>7. Values JSON does not have</h3>
    <p>
      <code>NaN</code>, <code>Infinity</code>, <code>-Infinity</code> and <code>undefined</code> are
      all valid in JavaScript and none of them are valid JSON. There is no date type either — dates
      are strings by convention, usually ISO 8601.
    </p>

    <h3>8. Something after the end</h3>
    <p>
      A JSON document holds exactly one top-level value. Two objects one after another, or a stray
      character after the closing brace, is invalid — this is what trips people up when they
      concatenate API responses or paste twice by accident.
    </p>

    <h2>How to read the error</h2>
    <p>
      Browser parsers report the character offset where parsing stopped, not where the mistake was
      made. Those are frequently different places, and knowing which is which saves most of the
      search time:
    </p>
    <ul>
      <li>
        <strong>Unexpected token</strong> — a character appeared where the grammar did not allow
        one. The real fault is usually just before the reported position: a missing comma, or a
        comma too many.
      </li>
      <li>
        <strong>Unexpected end of JSON input</strong> — the document stopped mid-structure. A
        bracket or brace was never closed, or the file was truncated in transit.
      </li>
      <li>
        <strong>Unexpected non-whitespace character after JSON</strong> — item 8 above. The document
        was complete and then continued.
      </li>
    </ul>
    <p>
      If the position looks like it points at perfectly good text, run the document through a
      formatter first. Reindenting turns a one-line file into a structure your eye can follow, and
      the imbalance usually becomes obvious.
    </p>

    <h2>Parsing cleanly is not the same as being correct</h2>
    <p>
      A document can be flawless JSON and still be wrong for your purpose. Three cases worth
      knowing, none of which any syntax validator reports:
    </p>
    <ul>
      <li>
        <strong>Missing or mistyped fields.</strong> Checking that <code>email</code> exists and is
        a string, or that <code>age</code> is a number in a range, is JSON Schema validation — a
        separate job from parsing, and not what this tool does.
      </li>
      <li>
        <strong>Duplicate keys.</strong> The specification permits them. The document parses and one
        value silently wins — but which one is not guaranteed to be the same across languages, so
        the same file can behave differently in two services.
      </li>
      <li>
        <strong>Large numbers.</strong> JSON numbers have no size limit, but most parsers read them
        as 64-bit floats. An integer beyond roughly 9×10<sup>15</sup> — a Twitter-style ID, say —
        parses without complaint and comes back subtly wrong. Transport those as strings.
      </li>
    </ul>

    <h2>JSON, JSONC and JSON5</h2>
    <p>
      If a file with comments works in your editor but fails here, it is probably not JSON.{" "}
      <code>tsconfig.json</code>, <code>devcontainer.json</code>{" "}
      and VS Code&rsquo;s settings are JSONC — JSON with comments and trailing commas — and JSON5 goes further, allowing unquoted
      keys and single quotes. Both are real formats with real tooling. Neither is accepted by a
      standard JSON parser, so a file that is fine in one place can be rejected by the next service
      that reads it. Validating against strict JSON is how you find that out before it ships.
    </p>
  </>
);

export function generateMetadata(): Metadata {
  const tool = getToolBySlug(TOOL_SLUG);
  if (!tool) return {};
  return buildToolMetadata(tool);
}

export default function Page() {
  const tool = getToolBySlug(TOOL_SLUG);
  if (!tool) notFound();

  const url = `${SITE_URL}/${tool.routeGroup}/${tool.slug}`;

  return (
    <>
      <StructuredData data={buildSoftwareApplicationJsonLd(tool, url)} />
      {tool.faq && tool.faq.length > 0 && <StructuredData data={buildFaqJsonLd(tool.faq)} />}
      <ToolPageLayout tool={tool} steps={HOW_IT_WORKS_STEPS} article={ARTICLE}>
        <SpreadsheetDataApp initialMode="analyze" lockedAnalyzeAction="json-validator" />
      </ToolPageLayout>
    </>
  );
}
