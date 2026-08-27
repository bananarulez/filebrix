import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "json-to-excel";

const HOW_IT_WORKS_STEPS = [
  "Paste JSON, or open a .json file.",
  "Check the preview — each object becomes a row, each key a column.",
  "Download the .xlsx workbook. Your JSON never leaves the browser.",
];

const TABLE_SHAPED = `[
  { "id": 1, "name": "Ada",   "role": "engineer" },
  { "id": 2, "name": "Grace", "role": "admiral"  }
]`;

const WRAPPED = `{
  "status": "ok",
  "results": [                <- this is the table
    { "id": 1, "name": "Ada" },
    { "id": 2, "name": "Grace" }
  ]
}`;

const NESTED = `{ "id": 1, "address": { "city": "London", "zip": "EC1" } }

flattened:
{ "id": 1, "address.city": "London", "address.zip": "EC1" }`;

/**
 * Carries a `ToolArticle` because the search demand behind this page is not
 * "how do I click convert" — it is people holding JSON that is not
 * table-shaped (nested objects, a wrapped payload) and needing to know what
 * to do about it. That question is answered here rather than left to the
 * tool to fail on.
 */
const ARTICLE = (
  <>
    <h2>Which JSON converts to a spreadsheet, and which does not</h2>
    <p>
      A spreadsheet is a grid: rows and columns, one value per cell. JSON is a tree. The conversion
      only works cleanly when your JSON already happens to be grid-shaped — an array of flat objects
      with the same keys:
    </p>
    <pre>
      <code>{TABLE_SHAPED}</code>
    </pre>
    <p>
      That becomes three columns (<code>id</code>, <code>name</code>, <code>role</code>) and two
      rows. Everything below is about what to do when your JSON does not look like that.
    </p>

    <h2>The API-response case: your table is nested one level down</h2>
    <p>
      This is the most common reason a conversion produces a single useless row. API responses
      usually wrap the data in an envelope:
    </p>
    <pre>
      <code>{WRAPPED}</code>
    </pre>
    <p>
      The top-level value here is one object, so it converts to one row with columns{" "}
      <code>status</code> and <code>results</code>. What you want is the inner array. Copy that
      array — from its opening bracket to its closing one — and convert that instead.
    </p>

    <h2>Nested objects</h2>
    <p>
      A cell holds one value, so <code>{"{ \"city\": \"London\" }"}</code> cannot go in a cell as a
      structure. The usual answer is to flatten: turn each leaf into its own column with a
      dotted name.
    </p>
    <pre>
      <code>{NESTED}</code>
    </pre>
    <p>
      Do that before converting and the result is a clean two-dimensional table. If the nesting is
      the point of the document — a configuration file, a deeply branched tree — a spreadsheet is
      the wrong destination and you will lose the structure. Convert to XML or YAML instead, both of
      which keep the hierarchy intact.
    </p>

    <h2>Arrays inside a row</h2>
    <p>
      A field like <code>{"\"tags\": [\"a\", \"b\", \"c\"]\""}</code> has no natural single-cell
      representation. Three options, in decreasing order of how well they survive a round trip:
      join the values into one delimited string, split them into numbered columns (
      <code>tags_1</code>, <code>tags_2</code>), or split the row into several rows, one per tag.
      Which is right depends on what you plan to do in Excel afterwards — filtering wants the third,
      reading wants the first.
    </p>

    <h2>Types, and what survives</h2>
    <ul>
      <li>
        <strong>Numbers</strong> stay numbers, so they sort and sum correctly in Excel.
      </li>
      <li>
        <strong>Booleans</strong> become <code>TRUE</code>/<code>FALSE</code>.
      </li>
      <li>
        <strong>null</strong> becomes an empty cell — which is indistinguishable from a missing key
        once it is in a spreadsheet. If that difference matters to you, it cannot survive the
        conversion.
      </li>
      <li>
        <strong>Dates</strong> are the one to watch. JSON has no date type, so they arrive as
        strings and are written as text rather than being auto-converted. This is deliberate:
        guessing between <code>03/04/2026</code> as March and as April silently corrupts data, and
        a wrong date is worse than an unformatted one. Format the column once in Excel.
      </li>
      <li>
        <strong>Very large integers</strong> lose precision above roughly 9×10<sup>15</sup>,
        because both JSON parsers and Excel store numbers as 64-bit floats. IDs of that size should
        be strings in the source JSON.
      </li>
    </ul>

    <h2>Column order and uneven objects</h2>
    <p>
      Columns are the union of every key across every object, so nothing is silently dropped when
      your records disagree about which fields they have — a row missing a key simply gets an empty
      cell. Order follows first appearance, which means the first object in the array effectively
      sets the layout. If you want a particular column order, put a complete record first.
    </p>

    <h2>Why .xlsx and not .xls</h2>
    <p>
      The output is <code>.xlsx</code>. The older <code>.xls</code> binary format caps out at 65,536
      rows and 256 columns and has been superseded since 2007; Excel, LibreOffice, Numbers and
      Google Sheets all open <code>.xlsx</code>. If something downstream genuinely requires{" "}
      <code>.xls</code>, open the result and re-save it from Excel — but check the row count first.
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
        <SpreadsheetDataApp
          initialMode="convert"
          lockedFormat="json"
          initialOutputFormat="xlsx"
          toolSlug={tool.slug}
        />
      </ToolPageLayout>
    </>
  );
}
