# MASTER PROJECT SPECIFICATION

# FileBrix — Universal Local File Toolbox

## 1. Product Vision

Build a production-quality, privacy-first, SEO-focused website providing a large collection of free online file and data tools.

The long-term goal is to support 100+ useful tools across:

* spreadsheets
* structured data
* PDF and documents
* images
* geospatial files
* developer/data utilities

Examples:

* CSV to Excel
* Excel to CSV
* Excel to JSON
* JSON to CSV
* XML to JSON
* Parquet to CSV
* Parquet Viewer
* Merge PDF
* Split PDF
* PDF to TXT
* Images to PDF
* PNG to JPG
* WebP to JPG
* Resize Image
* Compress Image
* GeoJSON Viewer
* KML to GeoJSON
* GPX Viewer

The defining product promise is:

# YOUR FILES NEVER LEAVE YOUR DEVICE.

All user-file processing must happen locally inside the browser.

There must be:

* no file uploads
* no temporary server storage
* no server-side file conversion
* no backend file processing
* no transmission of file contents to third-party APIs

This is a HARD architectural requirement.

If a tool cannot be implemented locally in the browser, do not implement it until a browser-compatible solution exists.

Never silently fall back to server-side processing.

---

# 2. Core Product Positioning

Primary positioning:

# Free Online File Tools That Run in Your Browser

Supporting message:

**Convert, view, edit and analyze files without uploading them.**

**Private by design — your files never leave your device.**

Core benefits:

* Free
* No account required
* No upload waiting
* Private
* Fast
* Browser-based
* No artificial server upload limits

Do not claim "unlimited file size."

Instead say:

**No server upload limits. Maximum practical file size depends on your device, browser, file format and operation.**

---

# 3. Business Goal

This is primarily an organic-search traffic business.

Primary acquisition:

Google and other search engines.

Primary monetization:

Display advertising.

Possible secondary monetization later:

* affiliate partnerships
* sponsorships
* optional Pro functionality
* API/CLI products

MVP does NOT require:

* subscriptions
* accounts
* login
* payments
* cloud storage

The initial goal is:

Build useful tools → rank for long-tail search queries → attract global organic traffic → monetize traffic.

---

# 4. Critical Architectural Rule

The architecture for every file tool must be:

User selects file
↓
Browser reads file locally
↓
JavaScript / WebAssembly / Web Worker processes file
↓
Result is created locally
↓
User downloads result

NOT:

User selects file
↓
Upload
↓
Our server
↓
Processing
↓
Download

User files must NEVER be sent to our infrastructure.

---

# 5. Technology Stack

Preferred application stack:

* Next.js
* TypeScript
* React
* Tailwind CSS

Use browser-native and WebAssembly technologies wherever appropriate.

Potential technologies include:

* Web Workers
* WebAssembly
* Streams API
* File System Access API with fallbacks
* Blob APIs
* DuckDB-WASM
* Apache Arrow JS
* SheetJS or another appropriate browser-compatible spreadsheet library
* PDF.js
* pdf-lib
* browser-compatible image APIs/libraries
* MapLibre GL JS
* Turf.js

Choose dependencies carefully.

Avoid unnecessarily large libraries when smaller alternatives exist.

Heavy libraries must be lazy-loaded only on pages that require them.

---

# 6. Backend Policy

The backend may only be used for things unrelated to user-file contents, such as:

* serving the website
* server-rendered/static SEO content
* configuration
* anonymous analytics
* advertising configuration

The backend must NEVER:

* receive user files
* parse user files
* convert user files
* store user files
* inspect user files
* proxy user files to external services

No API route should accept file uploads.

Do not create file-upload endpoints.

---

# 7. Privacy

Privacy is a core product feature.

Every applicable tool should display:

🔒 **Processed locally**

**Your file stays on your device and is processed directly in your browser.**

Provide an explanation:

**How does this work?**

The website uses browser technologies such as JavaScript and WebAssembly to process files locally. Your files are never uploaded to our servers.

Never send to analytics:

* filenames where avoidable
* file contents
* cell values
* document text
* coordinates
* image contents
* generated outputs

---

# 8. Product Architecture: Processing Engines

Do NOT build 100 unrelated tools.

Build reusable processing engines.

A single engine should power many individual tools.

Core engines:

1. Spreadsheet & Structured Data Engine
2. Parquet / Analytical Data Engine
3. PDF & Document Engine
4. Image Engine
5. Geospatial Engine
6. Developer Utility Engine

Each individual tool gets:

* its own URL
* its own SEO metadata
* its own focused UI
* its own explanatory content

But related tools must share processing code.

---

# 9. ENGINE A — Spreadsheet & Structured Data

Target formats:

* CSV
* TSV
* XLSX
* XLS where technically feasible
* ODS where technically feasible
* JSON
* XML
* YAML

Build a common internal representation where appropriate.

Potential tools:

## Conversion

* CSV to Excel
* Excel to CSV
* CSV to JSON
* JSON to CSV
* Excel to JSON
* JSON to Excel
* CSV to XML
* XML to CSV
* JSON to XML
* XML to JSON
* CSV to TSV
* TSV to CSV
* Excel to TSV
* JSON to YAML
* YAML to JSON

## Viewing

* CSV Viewer
* Excel Viewer
* JSON Viewer
* XML Viewer

## Editing / Transformation

* CSV Cleaner
* Remove Duplicate CSV Rows
* Merge CSV Files
* Split CSV
* Compare CSV Files
* Change CSV Delimiter
* Rename CSV Columns
* Remove CSV Columns
* CSV Encoding Converter

Do not build a full spreadsheet application.

Keep tools focused.

---

# 10. Spreadsheet Conversion Architecture

Avoid writing separate conversion logic for every pair.

Prefer architecture such as:

Input Parser
↓
Normalized Data Representation
↓
Output Serializer

Example:

CSV
↓
Parser
↓
Normalized table
↓
XLSX exporter

The same normalized table can support:

CSV → XLSX
CSV → JSON
CSV → XML
CSV → TSV

This should make adding new conversion combinations easy.

---

# 11. ENGINE B — Parquet / Analytical Data

Formats:

* Parquet
* CSV
* JSON
* Arrow where practical

Potential tools:

* Parquet Viewer
* Parquet to CSV
* CSV to Parquet
* Parquet to JSON
* JSON to Parquet
* Parquet Schema Viewer
* Parquet Metadata Viewer
* Merge Parquet
* Split Parquet
* Parquet Statistics
* Parquet Row Counter

Potential technologies:

* DuckDB-WASM
* Apache Arrow

Large-file handling is especially important here.

---

# 12. ENGINE C — PDF & Documents

Target formats:

* PDF
* TXT
* Markdown
* HTML
* images where used to create PDFs

Initial PDF tools:

* Merge PDF
* Split PDF
* Rotate PDF
* Extract PDF Pages
* Delete PDF Pages
* Reorder PDF Pages
* Images to PDF
* PDF to Images
* PDF to TXT
* TXT to PDF
* PDF Metadata Viewer
* Remove PDF Metadata

Potential later tools:

* Compress PDF
* HTML to PDF where browser-only quality is acceptable
* Markdown to PDF
* PDF page numbering
* Watermark PDF

Do NOT promise high-quality conversions that cannot be reliably performed locally.

Examples requiring careful evaluation:

* PDF to DOCX
* complex DOCX to PDF
* OCR-heavy PDF conversions

If quality would be poor, do not implement the tool merely for SEO.

---

# 13. PDF Privacy

All PDF processing must happen locally.

A PDF selected by the user must never leave their browser.

This is an important selling point because PDFs may contain:

* contracts
* invoices
* financial documents
* private records
* business information

Prominently display local-processing messaging.

---

# 14. ENGINE D — Images

Target formats:

* JPG / JPEG
* PNG
* WebP
* AVIF where browser support allows
* SVG
* GIF where appropriate
* HEIC if a reliable browser-compatible decoder is available

Potential conversion tools:

* PNG to JPG
* JPG to PNG
* WebP to JPG
* JPG to WebP
* PNG to WebP
* WebP to PNG
* SVG to PNG
* SVG to JPG
* AVIF to JPG
* AVIF to PNG
* HEIC to JPG if reliable

Image utility tools:

* Resize Image
* Compress Image
* Crop Image
* Rotate Image
* Flip Image
* Remove EXIF Metadata
* Image Metadata Viewer
* Change Image Dimensions
* Convert Image Format

Support batch processing where it is easy and safe.

Example:

Drop 30 WebP images
↓
Convert all locally
↓
Download results

If multiple outputs are produced, optionally package them into a ZIP locally in the browser.

---

# 15. Image Privacy

Images must never be uploaded.

Use messaging such as:

**Private image conversion**

Your photos are processed locally and never uploaded.

This should differentiate the product from upload-based image converters.

---

# 16. ENGINE E — Geospatial

Target formats:

* GeoJSON
* KML
* GPX
* Shapefile where browser processing is feasible
* CSV with coordinates
* possibly GeoPackage later if browser support is practical

Initial tools:

* GeoJSON Viewer
* GeoJSON Validator
* GeoJSON to KML
* KML to GeoJSON
* GPX Viewer
* GPX to GeoJSON
* GPX to KML
* GeoJSON to CSV
* CSV Coordinates to GeoJSON
* Coordinate Converter
* GeoJSON Simplifier

Potential later tools:

* Shapefile to GeoJSON
* GeoJSON to Shapefile
* Merge GeoJSON
* Split GeoJSON
* Geometry Repair
* CRS Transformation
* UTM to Latitude/Longitude
* Latitude/Longitude to UTM
* GPX Merge
* GPX Split
* GPX Reverse
* GPX Simplify

Use:

* MapLibre GL JS
* Turf.js
* browser-compatible geospatial libraries

---

# 17. Map Privacy

Map tiles may be loaded from an external tile provider.

However:

User geometries and coordinates must not be transmitted to external APIs merely for visualization.

Do not send:

* GeoJSON
* GPX tracks
* KML
* properties
* uploaded datasets

to a third-party map API.

Render user data locally over the basemap.

---

# 18. ENGINE F — Developer & Data Utilities

These tools may not require files.

Potential tools:

* JSON Formatter
* JSON Validator
* JSON Minifier
* XML Formatter
* XML Validator
* YAML Formatter
* Base64 Encode
* Base64 Decode
* URL Encode / Decode
* UUID Generator
* Hash Generator
* Unix Timestamp Converter
* Regex Tester
* SQL Formatter
* CSV to SQL INSERT
* JSON to SQL INSERT
* Data Type Detector
* Text Diff
* JSON Diff

These tools should run entirely client-side.

They can significantly expand SEO coverage without increasing server costs.

---

# 19. Universal Homepage Experience

The homepage should have two primary ways to find a tool.

## Option A — Tool Search

Large search box:

**What do you want to do?**

Examples:

`convert csv to excel`

`merge pdf`

`open parquet`

`webp to jpg`

`view geojson`

Search should instantly suggest relevant tools.

## Option B — Drop Any File

Prominent area:

# Drop any file

**We'll show you what you can do with it.**

This is NOT an upload.

The file must only be inspected locally.

Example:

User drops:

`report.xlsx`

The browser detects:

**Excel spreadsheet detected**

Then displays:

### Convert

* CSV
* JSON
* TSV

### View

* Open spreadsheet

### Tools

* Split workbook
* Inspect sheets

Do not send the file anywhere.

---

# 20. File Type Detection

Detect file types locally.

Do not rely only on extensions.

Where practical, inspect:

* MIME type
* file signature / magic bytes
* structure

Never transmit the file for detection.

---

# 21. Tool Registry

Create a central Tool Registry.

Conceptual structure:

ToolDefinition:

* id
* name
* slug
* category
* engine
* description
* keywords
* acceptedFileTypes
* outputFileTypes
* processor
* relatedTools
* seoTitle
* seoDescription
* privacyMode

This registry should power:

* routing
* homepage search
* category pages
* related tools
* SEO sitemap
* internal linking

Adding a new simple tool should require minimal boilerplate.

---

# 22. URL Structure

Use clean, stable URLs.

Examples:

/convert/csv-to-excel

/convert/excel-to-csv

/convert/json-to-csv

/convert/parquet-to-csv

/convert/webp-to-jpg

/convert/png-to-webp

/pdf/merge

/pdf/split

/pdf/rotate

/tools/csv-viewer

/tools/excel-viewer

/tools/parquet-viewer

/tools/json-formatter

/geo/geojson-viewer

/geo/kml-to-geojson

/geo/gpx-viewer

Avoid unnecessary URL nesting.

---

# 23. SEO Is a Core Product Requirement

Organic search is the primary acquisition channel.

Every useful tool must have a dedicated indexable page.

Each page needs:

* unique title
* unique meta description
* H1
* concise introduction
* working tool immediately visible
* local-processing/privacy explanation
* how-to instructions
* useful FAQ
* related tools
* canonical URL
* structured data where appropriate

Do NOT create hundreds of empty programmatic SEO pages.

Every indexed page must contain a real working tool or genuinely useful functionality.

---

# 24. SEO Example

URL:

/convert/excel-to-csv

Title:

**Excel to CSV Converter — Free, Private & No Upload**

H1:

# Excel to CSV Converter

Description:

Convert Excel XLSX files to CSV directly in your browser.

**Your spreadsheet never leaves your device.**

Then immediately show the tool.

Below:

### How to convert Excel to CSV

1. Select your Excel file.
2. Choose the sheet if necessary.
3. Convert locally in your browser.
4. Download the CSV.

### Is my Excel file uploaded?

No.

Your file is processed locally on your device.

### Can I convert large Excel files?

There is no server upload limit.

The practical maximum depends on your device, browser and spreadsheet complexity.

Then FAQ and related tools.

---

# 25. Search Intent Strategy

Create tools around real search intent.

Important keyword patterns include:

X to Y

Examples:

* csv to excel
* excel to csv
* png to jpg
* webp to jpg

Viewer intent:

* parquet viewer
* csv viewer
* geojson viewer

Action intent:

* merge pdf
* split pdf
* compress image
* resize image

Large-file intent:

* large csv viewer
* convert large parquet to csv
* open huge csv

Privacy intent:

* private pdf converter
* offline file converter
* convert file without upload

Do not keyword-stuff.

Use these naturally.

---

# 26. Internal Linking

Related tools should link naturally.

Example:

CSV to Excel page:

Related:

* Excel to CSV
* CSV Viewer
* CSV to JSON
* CSV Cleaner

WebP to JPG:

Related:

* JPG to WebP
* WebP to PNG
* Compress Image
* Resize Image

Strong internal linking is important for SEO and usability.

---

# 27. Category Pages

Create useful category pages:

/spreadsheet-tools

/data-tools

/pdf-tools

/image-tools

/geospatial-tools

/developer-tools

Each should:

* explain the category briefly
* list tools clearly
* allow search/filter
* link to every relevant tool

Do not create long SEO filler articles.

Note (as built): the URLs above are the original spec. Four of these
categories became unified Studio applications and their live URLs are
/data-studio, /pdf-studio, /image-studio and /geospatial-studio;
/developer-tools stayed a categorized collection of independent tools.
Every original URL listed above permanently redirects to its current
one — see next.config.ts#redirects() and CLAUDE.md rule 10.

---

# 28. Large File Strategy

Large-file support can be a major differentiator.

Because files are not uploaded, there is no server upload limit.

However, browser resources are finite.

Use:

* streaming where possible
* chunked processing
* Web Workers
* virtualized tables
* lazy parsing
* incremental output
* memory-efficient data structures

Do not create unnecessary full-memory copies.

---

# 29. Web Workers

Heavy operations should not freeze the UI.

Use Web Workers for CPU-heavy processing where appropriate.

Examples:

* large CSV parsing
* Parquet conversion
* image batch processing
* complex geospatial transformations

The main UI must remain responsive.

---

# 30. Large File UX

Example:

**Large file detected — 2.7 GB**

This file will be processed locally on your device.

Processing time and memory usage depend on your computer and browser.

[Continue]

Never say:

"Uploading"

Use:

* Opening file
* Reading locally
* Processing
* Converting
* Preparing download

---

# 31. Graceful Failure

If local processing fails due to browser/device limitations:

Show:

**Your browser could not process this file with the available memory.**

Your file was never uploaded.

Suggestions:

* close unused browser tabs
* use a desktop browser
* use a device with more memory
* try a smaller or simpler operation

Never fall back to uploading the file.

---

# 32. Download Architecture

Generated output must be created locally.

Use:

* Blob APIs
* Streams API
* File System Access API where appropriate
* local ZIP generation for batches

For large outputs, prefer streaming when technically possible.

Provide fallbacks for browser compatibility.

---

# 33. Browser Support

Target latest stable:

* Chrome
* Edge
* Firefox
* Safari

Desktop is the priority for large-file tools.

Mobile should work for reasonable file sizes.

If a browser lacks a required capability:

show a clear message.

Never use server processing as a fallback.

---

# 34. Shared UI Components

Create reusable components:

* ToolSearch
* UniversalFileDrop
* FileDropZone
* LocalProcessingBadge
* FileInfo
* FileTypeBadge
* ProcessingProgress
* ProcessingStatus
* DataPreview
* VirtualizedTable
* DownloadResult
* ErrorPanel
* RelatedTools
* ToolInstructions
* FAQ
* AdSlot

Do not duplicate UI logic across tools.

---

# 35. Tool UX

Most tools should follow:

Title

Short description

Privacy badge

Tool interface

Result

Download

Optional ad slot

How it works

FAQ

Related tools

The tool itself should appear above the fold whenever practical.

Do not force users to scroll through SEO text before using it.

---

# 36. Design

Style:

* modern
* minimal
* professional
* fast
* trustworthy
* clean

Avoid:

* excessive gradients
* animations everywhere
* startup marketing clutter
* intrusive popups
* fake download buttons
* confusing ads

The site should feel like a professional utility.

---

# 37. Advertising Architecture

Create reusable:

AdSlot

Potential placements:

* below the main tool
* after results
* inside longer informational sections
* category pages
* left/right side rails on wide screens (implemented — see
  components/layout/SideRailAds.tsx; hidden below 1280px, where there's no
  room for one without crowding the content column)

Ads must never:

* look like action buttons
* resemble download buttons
* interrupt file processing
* cause major layout shifts

Do not add fake advertising during development.

Only create clean placeholders/integration architecture.

---

# 38. Analytics

Use privacy-conscious analytics.

Allowed:

* page views
* tool opened
* processing started
* processing completed
* generic processing failure
* related tool clicked

Never send:

* file contents
* filenames where avoidable
* spreadsheet values
* document text
* coordinates
* image contents
* generated output

Create an analytics abstraction so providers can be changed later.

---

# 39. Security

Treat every local file as untrusted input.

Protect against:

* malformed files
* XSS through displayed values
* malicious SVG
* unsafe XML
* XML external entities
* malicious filenames
* memory exhaustion
* decompression bombs
* embedded scripts
* unsafe HTML

Never execute file contents.

Sanitize all rendered user-controlled text.

SVG must be handled especially carefully.

---

# 40. Performance

Performance and Core Web Vitals are critical.

Use:

* code splitting
* dynamic imports
* lazy loading
* static/server-rendered SEO content
* efficient client hydration

Do NOT load:

* PDF engine on PNG converter
* MapLibre on CSV converter
* DuckDB-WASM on JSON formatter
* image processing engine on Parquet viewer

Each page should load only what it needs.

---

# 41. Accessibility

Use semantic HTML.

Support:

* keyboard navigation
* visible focus states
* screen-reader labels
* sufficient contrast
* accessible errors

Drag-and-drop must always have a normal file picker alternative.

---

# 42. Initial Release Strategy

Do NOT attempt to launch 100 tools simultaneously.

Build reusable engines first.

The long-term architecture should support 100+ tools.

The initial public release should target approximately 20–30 high-quality tools.

---

# 43. PHASE 1 — Foundation

First build:

* Next.js project
* TypeScript
* Tailwind
* shared layout
* Tool Registry
* universal tool search
* UniversalFileDrop
* privacy components
* processing worker architecture
* error handling
* SEO metadata architecture
* sitemap generation
* robots.txt
* canonical URLs
* analytics abstraction
* AdSlot abstraction
* category architecture

Then implement ONE complete production-quality tool:

# Parquet Viewer

It must include:

* local processing
* file information
* schema
* row/column count
* virtualized preview
* responsive UI
* privacy messaging
* SEO page
* FAQ
* related tools
* graceful large-file handling

Do not continue until this architecture is solid.

---

# 44. PHASE 2 — First Tool Set

After foundation validation, implement a high-value initial set.

## Data / Spreadsheet

1. Parquet Viewer
2. Parquet to CSV
3. CSV to Parquet
4. CSV Viewer
5. CSV to Excel
6. Excel to CSV
7. CSV to JSON
8. JSON to CSV
9. JSON Formatter & Validator
10. Excel Viewer

## PDF

11. Merge PDF
12. Split PDF
13. Rotate PDF
14. Images to PDF
15. PDF to Images

## Images

16. PNG to JPG
17. JPG to PNG
18. WebP to JPG
19. JPG to WebP
20. Resize Image
21. Compress Image
22. Remove EXIF Metadata

## Geospatial

23. GeoJSON Viewer
24. KML to GeoJSON
25. GPX Viewer

This is a strong initial target.

However, prioritize quality over hitting exactly 25 tools.

---

# 45. PHASE 3 — Expansion

After launch, use real search data to decide what to build.

Use:

* Google Search Console impressions
* clicks
* ranking queries
* user tool searches
* related-tool usage

If:

"parquet viewer"

gets strong impressions,

expand Parquet tools.

If:

"webp to jpg"

performs strongly,

expand image conversion.

If:

GPX gets little traffic,

do not spend weeks expanding GPX.

Let real demand guide development.

---

# 46. Conversion Matrix

Build an internal conversion capability matrix.

Example:

| From | To | Engine | Supported |
| CSV | XLSX | Spreadsheet | Yes |
| XLSX | CSV | Spreadsheet | Yes |
| CSV | JSON | Structured Data | Yes |
| JSON | CSV | Structured Data | Yes |
| PNG | JPG | Image | Yes |
| JPG | WebP | Image | Yes |
| KML | GeoJSON | Geo | Yes |

Use this matrix to:

* generate tool navigation
* validate supported conversions
* power "What can I convert this file to?"
* identify future tool opportunities

Do NOT automatically generate public SEO pages for unsupported or low-quality conversions.

---

# 47. Universal File Action System

When a user drops a file on the homepage:

Detect locally.

Then query the Tool Registry.

Example:

Input:

photo.webp

Display:

**WebP image**

Available actions:

### Convert

JPG

PNG

AVIF

### Edit

Resize

Compress

Rotate

### Privacy

🔒 Everything happens locally.

The action recommendations should be generated from deterministic Tool Registry data.

No AI is required.

---

# 48. No AI Requirement

Do NOT add AI merely because it is fashionable.

Most tools should use deterministic processing.

AI APIs would:

* increase cost
* create privacy concerns
* create latency
* complicate architecture

The MVP should not require any LLM or AI API.

AI may only be considered later for functionality that genuinely requires it.

---

# 49. Naming / Branding

Use a temporary working name in development.

Do not tightly couple code to a final brand name.

Brand should eventually communicate:

* files
* tools
* privacy
* speed

Do not delay development waiting for perfect branding.

---

# 50. Important Product Principles

## Principle 1

Files never leave the user's device.

Never compromise this.

## Principle 2

One tool solves one clear problem.

## Principle 3

Build engines, not hundreds of duplicate implementations.

## Principle 4

SEO pages must contain real tools.

No low-quality programmatic SEO spam.

## Principle 5

Do not artificially limit file size to sell subscriptions.

## Principle 6

Do not use AI when deterministic code works.

## Principle 7

Performance matters.

## Principle 8

Privacy is part of the product.

## Principle 9

Build according to real search demand.

## Principle 10

Keep operational costs extremely low.

---

# 51. Cost Philosophy

The application should be designed so early-stage operational costs are close to zero.

User CPU performs processing.

User RAM handles data.

User browser performs conversions.

Our infrastructure primarily serves:

* HTML
* JavaScript
* CSS
* WASM assets
* static content

Avoid architecture requiring:

* large servers
* background workers
* queues
* file storage
* databases for file processing
* expensive APIs

The site should be able to handle significant growth without processing costs scaling linearly with file volume.

---

# 52. Definition of MVP Success

MVP is successful when:

* tools work reliably
* files never leave browser
* site is fast
* pages are indexable
* privacy claim is technically true
* adding a new tool is easy
* users can complete tasks without accounts
* operating costs remain very low

Business success will later be measured by:

* organic impressions
* organic clicks
* monthly users
* pageviews
* repeat users
* tool completion rate
* ad revenue
* growth of search visibility

---

# 53. VERY IMPORTANT IMPLEMENTATION INSTRUCTION

Do NOT attempt to implement the entire long-term product in one giant coding pass.

Work incrementally.

First:

1. Analyze this specification.
2. Propose the final technical architecture.
3. Define folder structure.
4. Define Tool Registry schema.
5. Define processing-engine interfaces.
6. Define worker architecture.
7. Define privacy/security boundaries.
8. Define SEO architecture.
9. Identify required dependencies and justify each one.

Then implement the foundation.

Then implement ONE complete vertical slice:

# Parquet Viewer

Make it production quality.

Test:

* normal files
* malformed files
* moderately large files
* empty files
* unusual schemas
* browser errors

Only after the architecture has been validated with a complete tool should additional tools be added.

Do not generate dozens of placeholder tools that do not work.

Quality and reusable architecture are more important than tool count.

---

# 54. Final Long-Term Goal

Create a large global utility website where users can:

# Drop almost any common file and immediately see what they can do with it.

Without:

* uploading it
* creating an account
* installing software
* sacrificing privacy

The long-term product should become a trusted destination for:

**"I have this file and I need to view, convert, inspect, edit or transform it quickly."**

The moat is not one complicated feature.

The moat is:

* broad tool coverage
* excellent UX
* privacy
* local browser processing
* speed
* strong SEO
* low operating costs
* hundreds of useful search entry points

Build the architecture with that long-term goal in mind while keeping the first release small, reliable and realistic for a solo developer.
