import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/registry";
import { buildToolMetadata, SITE_URL } from "@/lib/seo/metadata";
import { buildFaqJsonLd, buildSoftwareApplicationJsonLd } from "@/lib/seo/structuredData";
import { StructuredData } from "@/components/seo/StructuredData";
import { ToolPageLayout } from "@/components/tool-page/ToolPageLayout";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";

const TOOL_SLUG = "yaml-formatter";

const HOW_IT_WORKS_STEPS = [
  "Paste YAML, or open a .yaml / .yml file.",
  "Click Format.",
  "Copy or download the reindented result. A malformed document fails with a specific parse error instead.",
];

const NORWAY = `countries:
  - NO      # becomes false
  - SE
  - "NO"    # stays the string "NO"`;

const TABS = `server:
\tport: 8080     # tab — rejected by every YAML parser
server:
  port: 8080     # two spaces — correct`;

const COLON = `title: Report: Q3     # invalid — second colon ends the key
title: "Report: Q3"  # valid`;

/**
 * Carries a `ToolArticle` because YAML's failure modes are mostly not parse
 * errors — they are documents that parse perfectly and mean something other
 * than what was written. A formatter cannot warn about that, so the page
 * does.
 */
const ARTICLE = (
  <>
    <h2>What formatting actually does</h2>
    <p>
      The document is parsed into data and written back out with consistent indentation and spacing.
      That is a stronger operation than reindenting text, and it has two consequences worth knowing
      before you paste something important.
    </p>
    <p>
      First, <strong>a malformed document cannot be formatted</strong> — it fails with a parse
      error, which makes the formatter a validator by side effect. Second,{" "}
      <strong>comments are lost</strong>. Comments are not part of the data, so the round trip
      through the parser drops them. Your original file is never modified — the result is a new
      document — but if the comments matter, keep the original.
    </p>

    <h2>The Norway problem, and other values that change meaning</h2>
    <p>
      This is the single most surprising thing about YAML, and it is the reason a config can parse
      cleanly and still be wrong. YAML 1.1 treats a set of bare words as booleans:{" "}
      <code>yes</code>, <code>no</code>, <code>on</code>, <code>off</code>, <code>y</code>,{" "}
      <code>n</code>, <code>true</code>, <code>false</code>. So a list of country codes does this:
    </p>
    <pre>
      <code>{NORWAY}</code>
    </pre>
    <p>
      Norway&rsquo;s country code becomes the boolean <code>false</code>. The fix is always the
      same: quote it. Related traps in the same family —
    </p>
    <ul>
      <li>
        <code>version: 1.20</code> is the number <code>1.2</code>. Trailing zeros are lost, and
        version numbers with two dots (<code>1.2.3</code>) are strings while ones with a single dot
        are numbers, so a list of versions can have mixed types.
      </li>
      <li>
        <code>port: 08</code> is an error and <code>mode: 0644</code> is not what you think — a
        leading zero means octal in YAML 1.1.
      </li>
      <li>
        <code>time: 12:30</code> can be read as a sexagesimal number rather than a string.
      </li>
      <li>
        An empty value is <code>null</code>, not an empty string. <code>name:</code> with nothing
        after it does not mean <code>name: &quot;&quot;</code>.
      </li>
    </ul>
    <p>
      YAML 1.2 narrowed the boolean list to just <code>true</code>/<code>false</code>, but which
      version applies depends on the parser reading your file, not on the file itself. Quoting
      anything that should be a string is the only portable answer.
    </p>

    <h2>Indentation rules</h2>
    <p>
      <strong>Tabs are forbidden as indentation.</strong> Not discouraged — forbidden by the
      specification, and every parser rejects them. This is the most common hard failure, and it is
      invisible in most editors:
    </p>
    <pre>
      <code>{TABS}</code>
    </pre>
    <p>
      The number of spaces is up to you as long as it is consistent within a block; two is the
      convention. Formatting here always emits spaces, which is why there is no tab option — it
      would produce a file most tools reject.
    </p>

    <h2>Colons and other characters that need quoting</h2>
    <p>
      A colon followed by a space ends a key, so it cannot appear unquoted in a value:
    </p>
    <pre>
      <code>{COLON}</code>
    </pre>
    <p>
      The same applies to a value starting with <code>@</code>, <code>`</code>, <code>%</code>,{" "}
      <code>*</code>, <code>&amp;</code>, <code>!</code>, <code>{"{"}</code> or <code>[</code> — all
      are reserved characters. A <code>#</code> preceded by a space starts a comment anywhere in a
      line, which is how URLs with fragments get silently truncated.
    </p>

    <h2>Anchors and aliases are left alone</h2>
    <p>
      YAML can define a value once with an anchor (<code>&amp;name</code>) and reference it
      elsewhere (<code>*name</code>). Formatting does not introduce them: repeated values are
      written out in full. A formatter that helpfully deduplicated your config would hand back a
      document you did not recognise, which is the opposite of what tidying is for.
    </p>

    <h2>Multi-document files</h2>
    <p>
      A single file can hold several documents separated by <code>---</code>, which is standard in
      Kubernetes manifests. Formatting works on one document at a time, so split a multi-document
      file first. The <code>---</code> at the top of a single-document file is optional and purely
      conventional.
    </p>

    <h2>If you want to check rather than tidy</h2>
    <p>
      Formatting fails on an invalid document, so it doubles as a syntax check. But if checking is
      the whole job, the YAML Validator reports the error without producing a reformatted document —
      and if you need to see what your YAML actually parsed to, converting it to JSON is the fastest
      way to catch a Norway problem, because JSON has no bare booleans to hide behind.
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
        <SpreadsheetDataApp initialMode="edit" lockedEditAction="yaml-formatter" />
      </ToolPageLayout>
    </>
  );
}
