# SEO — what's built, the rules, and what's next

Read this before touching titles, descriptions, URLs, the sitemap, structured
data or page copy. `CLAUDE.md` has the engineering rules; this file has the
search side: what already exists (so it isn't rebuilt), what the data says,
and the prioritised backlog. Update the **Status** and **Backlog** sections
whenever an item ships or new Search Console data arrives.

## Status (last updated 2026-10-16)

| | |
| --- | --- |
| Domain | `filebrix.com`, HTTPS only. `http://` and `www.` 301 to the apex |
| Pages in `sitemap.xml` | 140 |
| Indexed | 135 / 140 (Search Console, PROJECT_LOG entry 54) |
| Search Console, 28 days (entry 54) | 2,430 impressions · **1 click** · average position **71** |
| Search Console, 3 months to 2026-10-16 | 2,450 impressions · 3 clicks (**all three were the owner searching for the site, so 0 organic clicks**) · average position 71. Impressions rose from 1 Aug, peaked around 13 Aug at ~530/day and were ~0 from 17 Aug onwards. The 27 Aug title changes (entry 54) produced no recovery |
| Where the impressions are | JSON validation 33%, JSON⇄Excel 23%, images 15%, Excel/CSV 12%, YAML 7%, geo 4%, **PDF 0.1%** |
| Off-page work (backlinks, launches, directories) | **None done yet** |
| Bing Webmaster Tools | **Set up** (data from ~6 Aug 2026). To 2026-10-16: 58 impressions, 2 clicks. Unlike Google, impressions keep trickling in at 1–5/day and haven't dropped to 0 |
| IndexNow (Cloudflare Crawler Hints) | Not set up |
| GitHub repo | `github.com/bananarulez/filebrix`, **still private** (recreated 2026-10-16 with commit emails rewritten to the GitHub no-reply address). No secrets in history. Licensed **AGPL-3.0-only** (`LICENSE`), so it counts as open source for awesome lists, directories and AlternativeTo. `SITE_CONFIG.links.github` is set, so **don't deploy until the repo is public**, or the footer/About/Privacy links 404 |

**The diagnosis.** Technical SEO is essentially finished and verified. Pages
are findable and indexed, but they rank around position 70 because the
domain has almost no authority. Internal linking is **not** the problem
either: entry 48's audit found 0 broken links, 0 orphans and no page more
than 3 clicks deep. The bottleneck is **external links and trust**, and the
second lever is **sharper titles and content on the pages that already get
impressions**.

### Why impressions went to zero after 17 Aug (not a click penalty)

It's tempting to read the curve as "Google stopped showing it because nobody
clicked." That isn't the mechanism:

- **Google counts an impression only when the result is on a page the
  searcher actually loads.** Position 71 is page 8, which almost nobody
  opens, so an expected CTR of ~0% there is normal and isn't penalised.
- **The peak was a newness test.** Google gives a new site temporary trial
  rankings, then settles it where its authority puts it. For competitive
  queries with almost no backlinks, that's beyond the pages people look at,
  so impressions drop to ~0 even though the pages stay indexed.

**Ruled out as a cause (checked 2026-10-16):**
- **The localhost-canonical deploy on 5 Aug (entry 52).** It was live for
  minutes, a week *before* the peak.
- **The live site today.** Canonicals, titles and robots meta are correct.
- **Deploys during the drop.** None happened between 6 Aug and 27 Aug.

**The fix is authority (P0 below) plus long-tail niche queries** where few
strong sites compete. More on-page tweaking alone won't move it.

### Reading Cloudflare's "Visitors" chart

The dashboard's Analytics → Visitors tab is computed at the edge from
requests, not from a script running in a browser. It counts crawlers,
monitors and scrapers that don't identify as bots. About 771 visits a week
alongside 1 Search Console click a month means most of that traffic is
**not** organic search. Single-hour spikes of 50–130 (13, 14 and 15 Oct 2026)
are almost certainly crawler bursts. For a breakdown, use Analytics → Requests
filtered by referrer, path and user agent, or Security → Bots. **Search
Console is the source of truth for organic traffic.**

**Don't enable Cloudflare Web Analytics' JS beacon** (or any analytics
script). It loads from `static.cloudflareinsights.com`, which breaks
`script-src 'self'` and the e2e tests asserting zero off-origin requests,
and it contradicts the Privacy page. The edge analytics need no script.

## What is already built (don't rebuild it)

Each line points to the PROJECT_LOG entry or file that holds the detail.

- **One indexable page per tool** (110 tools). Every page has a unique
  title and description, an H1, the working tool above the fold, how-to
  steps, an FAQ, related tools and a canonical URL (`lib/seo/metadata.ts`).
  `registryIntegrity.test.ts` guards against unreachable tools.
- **Four-level URL hierarchy:** Home → Application → Capability → Tool. Every
  level is a real page (entry 21), and tool pages link up to their capability
  page through the breadcrumb (entry 36).
- **Structured data, consistent by page type** (entries 21, 48, 53):
  - Tool and Application pages: `SoftwareApplication` + `FAQPage` +
    `BreadcrumbList`.
  - Index pages: `CollectionPage`/`ItemList`.
  - Homepage: `WebSite`.
  - `structuredDataUrls.test.ts` checks that every URL inside the JSON-LD
    resolves.
- **The sitemap and robots.txt are derived from the registry**
  (`app/sitemap.ts`, `app/robots.ts`), so they can't drift from the pages
  that actually exist.
- **A canonical on every page**, baked in from `NEXT_PUBLIC_SITE_URL`.
  `cf:deploy` refuses to run with a missing or placeholder value (entry 52).
  `workers_dev` and `preview_urls` are off, so no duplicate hostnames
  (`wrangler.jsonc`).
- **Permanent redirects for every moved URL** (`public/_redirects`), checked
  by `deploy-headers.spec.ts`.
- **The homepage title is in the language of the need:** "…That Don't Upload
  Your Files" (entry 48).
- **One editorial page:** `/are-online-file-converters-safe` (entry 48).
  Deliberately only one; see the rules below.
- **Intent-led titles plus a long-form `ToolArticle`** on the four
  highest-impression pages: `json-validator`, `json-to-excel`,
  `excel-to-json` and `yaml-formatter` (entry 54).
- **Trust pages** (About, Contact, Privacy, Terms) are in the sitemap, and
  `/.well-known/security.txt` exists (entry 41).
- **Performance:** a static export served from Cloudflare's edge, a bundle
  budget gate (`check-bundle-budget.mjs`) and Lighthouse CI on three page
  types.
- **AI and SEO crawlers are not blocked.** Checked 2026-10-16: Bingbot,
  GPTBot, ClaudeBot, PerplexityBot, AhrefsBot, SemrushBot and Screaming Frog
  all get 200. Only the bare `Python-urllib` user agent gets 403 (Browser
  Integrity Check). To fetch the site from a script, send a browser
  `User-Agent`.

## Rules

1. **Lead the title with the searched term; never use a generic suffix.**
   Entry 54 measured the `— Free, Private & No Upload` suffix: it matched 3 of
   1,402 queries. The privacy claim belongs in the description and on the
   page, where it wins the click. Keep titles to ~60 characters and
   descriptions to ~155.
2. **Let Search Console decide, not intuition.** Choose which pages to
   improve by impressions. PDF Studio got 1 impression in 28 days; JSON got
   56%. Expect slow movement on head terms where iLovePDF, Smallpdf and Adobe
   own the results. The niches (Parquet, GIS formats, JSON/YAML/XML) are where
   a new domain can win.
3. **No doorway pages.** No phrase-variant pages, and no mass-generated
   format-pair pages: the converter can do 56 pairs and 19 have pages, on
   purpose. A page needs real query intent and a real working tool
   (README.txt §23, §44).
4. **`ToolArticle` is opt-in and earned.** Add one only to a page with
   measured impressions, and only to answer the question the query implies.
   Never pad.
5. **Don't change many titles at once.** Change them in batches of ~5–15,
   write down the date, and compare Search Console 4 weeks later. A
   site-wide rewrite makes it impossible to tell what worked.
6. **URLs are permanent.** A slug change needs a `_redirects` entry for the
   page and its sub-paths (CLAUDE.md rule 10).
7. **The registry is the single source** for the sitemap, links, counts and
   structured data (CLAUDE.md rule 8). Never hand-maintain a parallel list.
8. **Never trade privacy for SEO.** No tracking pixels, analytics scripts,
   third-party widgets or comment embeds.

## Backlog (prioritised)

Statuses: `[ ]` not started · `[~]` in progress · `[x]` done (add the date).

### P0 — authority (off-page, done by a person; the real bottleneck)

- [x] **Bing Webmaster Tools** (set up around 6 Aug 2026). Bing's index also
      feeds DuckDuckGo, Ecosia, Yahoo and ChatGPT search.
- [ ] **IndexNow**: turn on Cloudflare **Crawler Hints** (Caching →
      Configuration), which pings IndexNow automatically when content changes.
      No code needed.
- [~] **Publish the source code on GitHub** (or at least the engine and
      worker code) and fill `SITE_CONFIG.links.github`. For a "your files
      never leave your device" claim, verifiable code is the strongest trust
      signal available, it gives a high-authority backlink, and the
      `Organization` structured data gains a `sameAs`. **Biggest single
      lever.**
- [ ] **Show HN**: "File tools that never upload your file: DuckDB-WASM,
      pdf.js and MapLibre, all client-side." Lead with the verifiable claim
      and invite people to check the Network tab.
- [ ] **Niche communities.** Post only where the tool is the answer to a
      real thread, never as spam:
  - r/gis and GIS Stack Exchange: Shapefile/KML/TopoJSON → GeoJSON, CRS
    reprojection with the full EPSG catalogue, all in the browser.
  - r/dataengineering and r/DuckDB: an in-browser Parquet viewer, plus
    CSV ⇄ Parquet.
  - r/privacy and r/degoogle: the safety guide page.
  - r/webdev and r/selfhosted.
- [ ] **Directories**:
  - AlternativeTo, listed as an alternative to iLovePDF, Smallpdf, Convertio
    and CloudConvert.
  - Product Hunt.
  - SaaSHub.
  - Privacy-tool lists.
- [ ] **Pull requests to "awesome" lists**: awesome-geojson, awesome-gis,
      awesome-duckdb, awesome-privacy, awesome-json. These are one-line PRs
      that bring durable, relevant backlinks.
- [ ] **One or two technical write-ups** (dev.to, Hashnode, or a `/blog`
      page). The CLAUDE.md "silently wrong" stories are genuinely
      link-worthy, for example how a CSP made DuckDB-WASM fail with `function
      signature mismatch`, or running 8,000 EPSG projections client-side.
      Each one links back to its tool.
- [ ] **Social profiles** (X, Mastodon, LinkedIn): create only the ones that
      will actually be used, then fill `SITE_CONFIG.links`.

### P1 — on-page, data-led

- [ ] **Export fresh Search Console data** (Performance → Queries and Pages,
      last 3 months). Record the top 20 pages by impressions in this file,
      and rerun entry 54's theme grouping.
- [ ] **Retitle the next batch** of pages with impressions: lead with the
      query, and drop `— Free, Private & No Upload`. **107 tools still carry
      it.** Candidates from entry 54's themes: `json-formatter`,
      `json-to-csv`, `csv-to-json`, `excel-to-csv`, `csv-to-excel`,
      `xml-to-csv`, `yaml-validator`, `yaml-to-json`, `compress-image`,
      `png-to-jpg`, `jpg-to-png`, `webp-to-jpg`, `resize-image`.
- [ ] **A `ToolArticle` for the next 3–5 pages** by impressions, using the
      same diagnostic-question approach as entry 54.
- [ ] **Watch pages at position 8–20.** That's where a title or content
      change moves clicks most. Improve those first.

### P2 — technical polish (small code changes)

- [ ] **The homepage H1 still says "…That Run in Your Browser"**
      (`app/page.tsx:37`), and so does the root layout's fallback title
      (`app/layout.tsx:22`). Both should match the title chosen in entry 48.
- [ ] **The homepage is thin**: about 115 words inside `<main>`. Add a short,
      useful section: what can be done here, the most popular tools as plain
      links, and one sentence on how "no upload" can be verified.
- [ ] **Tool pages have no `og:image`.** Only the homepage has one. Generate
      a per-tool OG image at build time: `next/og` already runs statically
      (`opengraph-image.tsx` + `force-static`). Then switch `twitter.card` to
      `summary_large_image`. This affects how shared links look on social
      sites, chat apps and forums, which matters once the P0 outreach starts.
- [ ] **The sitemap has no `<lastmod>`.** Google ignores `priority` and
      `changefreq` but uses an accurate `lastmod`. Derive it per tool from
      the git date of `registry/tools/<slug>.ts` and its page at build time.
      Never stamp the build date on every URL: Google learns to ignore a
      `lastmod` that's always "now".
- [ ] **Trailing-slash and `.html` URLs answer 307 (temporary)**, not
      301/308. This is Cloudflare static-assets `html_handling` behaviour.
      Canonicals already consolidate these URLs, so it's low impact. Revisit
      only if Search Console reports "Page with redirect" problems.
- [ ] **No `Organization.sameAs`** until social and GitHub links exist. This
      follows automatically from P0.

### P3 — strategic, later

- [ ] **Localisation** (cs, de, es, pt, fr…). This is the biggest growth
      lever successful tool sites use, but it multiplies maintenance. It
      would need `hreflang`, translated FAQ and how-to copy, and per-locale
      sitemaps. Revisit once English pages reach positions 1–20 for their
      main queries. Translating pages that don't rank in English only
      multiplies pages that don't rank.
- [ ] **More editorial pages**, only where there's a real question with
      search demand that no tool page answers. "How to open a Parquet file
      without Python" and "How to convert a shapefile to GeoJSON" are
      plausible. Each one must be useful to someone who never uses this site.

## How to measure

- **Search Console**, monthly: impressions, clicks, average position, and
  the queries and pages tables. Compare equal 28-day windows. Note the date
  of every title change here, so a movement can be tied to its cause.
- **Bing Webmaster Tools**, once set up: the same metrics, plus a crawl
  error report.
- **Cloudflare edge analytics**: overall request volume and bot share. It is
  not a measure of organic traffic.
- **Changelog for SEO changes**: add a dated line under the relevant backlog
  item when it ships, and a PROJECT_LOG entry for anything non-trivial.
