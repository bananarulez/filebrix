import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "excel-to-json";

const HOW_IT_WORKS_STEPS = [
  "Select or drop an .xlsx or .xls workbook.",
  "Pick the sheet and the JSON shape you want.",
  "Download the JSON. The workbook is read on your device and never uploaded.",
];

const SHEET = `        A          B         C
1    name       role      salary
2    Ada        engineer  90000
3    Grace      admiral   95000`;

const AS_OBJECTS = `[
  { "name": "Ada",   "role": "engineer", "salary": 90000 },
  { "name": "Grace", "role": "admiral",  "salary": 95000 }
]`;

const AS_ARRAYS = `[
  ["name", "role", "salary"],
  ["Ada", "engineer", 90000],
  ["Grace", "admiral", 95000]
]`;

/**
 * Carries a `ToolArticle` because the failure mode here is silent rather
 * than loud: the conversion succeeds and the JSON is subtly wrong — dates
 * as serial numbers, blanks where merged headers were, lost leading zeros.
 * None of that produces an error, so the page has to say it.
 */
const ARTICLE = (
  <>
    <h2>The two JSON shapes, and which one you want</h2>
    <p>Given a sheet like this:</p>
    <pre>
      <code>{SHEET}</code>
    </pre>
    <p>
      <strong>An array of objects</strong> treats row 1 as keys. This is what almost every API,
      database import and JavaScript codebase expects:
    </p>
    <pre>
      <code>{AS_OBJECTS}</code>
    </pre>
    <p>
      <strong>An array of arrays</strong> keeps the raw grid, header row included. Use it when
      column order matters, when the sheet has no header row, or when duplicate column names would
      collide as object keys:
    </p>
    <pre>
      <code>{AS_ARRAYS}</code>
    </pre>

    <h2>Excel dates are numbers, and that is the main trap</h2>
    <p>
      A spreadsheet does not store <code>2026-03-14</code>. It stores <code>46095</code> — a count
      of days since 1 January 1900 — plus a display format telling Excel to render it as a date. A
      naive conversion reads the number and writes <code>46095</code> into your JSON, which then
      looks like plausible data and is not.
    </p>
    <p>
      This tool reads the cell&rsquo;s format alongside its value and writes dates in a readable
      form instead. Two related quirks worth knowing if you ever do this conversion elsewhere: the
      epoch is off by one because Excel deliberately reproduces a Lotus 1-2-3 bug that treats 1900
      as a leap year, and workbooks saved by older Mac versions of Excel count from 1904 instead, so
      the same number means a date four years apart depending on the file.
    </p>

    <h2>What else does not survive the way you expect</h2>
    <ul>
      <li>
        <strong>Formulas become their results.</strong> A workbook caches the last computed value of
        every formula, and that cached value is what you get. If the file was written by a tool that
        never calculated, those cells can be empty.
      </li>
      <li>
        <strong>Merged cells hold one value.</strong> Only the top-left cell of a merged range
        contains anything; the others are genuinely empty in the file. Merged title rows are the
        usual reason a converted sheet has a header of <code>null</code> values.
      </li>
      <li>
        <strong>Leading zeros are already gone.</strong> If a postcode or product code was stored as
        a number, Excel dropped the zeros when the file was saved. No conversion can recover them —
        the information is not in the file.
      </li>
      <li>
        <strong>Displayed values are not stored values.</strong> A cell showing <code>3.14</code>{" "}
        may hold <code>3.14159265</code>. Rounding is a display format; the JSON gets the full
        number.
      </li>
      <li>
        <strong>Nothing about appearance carries over.</strong> Colours, fonts, conditional
        formatting, column widths, comments and charts have no JSON representation and are dropped.
      </li>
    </ul>

    <h2>Header rows that are not header rows</h2>
    <p>
      Real workbooks often start with a title, a blank row and a logo before the actual table
      begins. Converting with the object shape then produces keys like <code>Sales report Q3</code>{" "}
      and <code>__EMPTY_1</code>. Delete everything above the real header row before converting —
      the conversion trusts the first row absolutely, and cleaning up afterwards in JSON is far more
      work than deleting three rows in Excel.
    </p>
    <p>
      The same applies to trailing content. A totals row at the bottom becomes a data record
      indistinguishable from the rest, and a footnote in column A becomes a row with one populated
      field.
    </p>

    <h2>Several sheets</h2>
    <p>
      Each sheet becomes its own JSON document rather than being merged, because sheets in one
      workbook rarely share a schema — merging them would produce records with mostly-empty fields.
      Convert the sheets you need one at a time and combine them afterwards if you actually want one
      array.
    </p>

    <h2>.xls as well as .xlsx</h2>
    <p>
      Both are read. <code>.xlsx</code> is the modern zipped XML format; <code>.xls</code> is the
      pre-2007 binary one, still produced by plenty of legacy exports and capped at 65,536 rows. If
      an <code>.xls</code> export looks truncated, that limit is the first thing to check — the data
      may have been lost before you received the file.
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
          lockedFormat="xlsx"
          initialOutputFormat="json"
          toolSlug={tool.slug}
        />
      </ToolPageLayout>
    </>
  );
}
