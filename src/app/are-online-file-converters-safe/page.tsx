import type { Metadata } from "next";
import Link from "next/link";
import { buildCategoryMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ContentPageLayout, ContentSection } from "@/components/site-pages/ContentPageLayout";

const PATH = "/are-online-file-converters-safe";

export const metadata: Metadata = buildCategoryMetadata(
  "Are Online File Converters Safe?",
  "What actually happens to a file you upload to a converter, how to check whether a tool uploads yours at all, and when it genuinely doesn't matter.",
  PATH
);

/**
 * The site's first page written for a *question* rather than a file format.
 *
 * Every other indexed page here targets a transactional query — "xml to csv",
 * "merge pdf". Those are winnable for a new domain because the intent is
 * narrow. Nothing targeted the category-level question people actually ask
 * before they trust a converter with a contract or a passport scan, which is
 * the query this product has the best possible answer to.
 *
 * Two rules govern what's written here, and both matter more than ranking:
 *
 *  1. **It has to be useful to someone who then doesn't use this site.** The
 *     "how to check" section works on any converter, including competitors.
 *     A page that only concludes "so use ours" is marketing, and marketing
 *     doesn't earn the links that a new domain actually needs.
 *  2. **Our own limits are stated as plainly as everyone else's.** The tile
 *     exception, the fact that you're trusting served JavaScript, and the
 *     cases where uploading is fine. Anything else would be the same
 *     unverifiable promise the page criticises.
 *
 * Deliberately ONE page, not a set of phrase variants ("safe data
 * conversion", "private file viewer", …). That pattern is what Google calls
 * doorway pages, and it's the same thin-content trap `registry/studios.ts`
 * already avoids by giving a zero-tool capability no index page.
 */
export default function AreOnlineFileConvertersSafePage() {
  return (
    <ContentPageLayout
      title="Are Online File Converters Safe?"
      path={PATH}
      intro="Usually the honest answer is “it depends what you're converting” — and for most tools, you have no way to check. Here's what actually happens to an uploaded file, and how to tell the difference for yourself."
    >
      <ContentSection title="The short answer">
        <p>
          A conventional online converter works by <strong>uploading your file to a server</strong>,
          processing it there and sending the result back. That is not inherently malicious, and for a
          holiday photo it hardly matters. It matters a great deal for a signed contract, a medical
          record, a passport scan, an export of customer data, or anything under a confidentiality
          agreement — because you have handed a full copy of it to a company whose deletion policy you
          cannot verify.
        </p>
        <p>
          A smaller number of tools never upload anything, doing the work inside your browser instead.
          The important part is not which kind you prefer, but that{" "}
          <strong>you can tell which kind you are looking at in about thirty seconds</strong>.
        </p>
      </ContentSection>

      <ContentSection title="What uploading actually commits you to">
        <p>
          Once a file leaves your device, four things stop being under your control, and no privacy
          policy can give them back:
        </p>
        <p>
          <strong>Copies you can&rsquo;t count.</strong>{" "}
          A file that reaches a server is typically
          written to disk, replicated for durability, and captured in backups. &ldquo;Deleted after one
          hour&rdquo; usually describes the primary copy. Backups have their own retention.
        </p>
        <p>
          <strong>Staff access.</strong>{" "}
          Someone at the provider can technically read what you
          uploaded. Reputable companies restrict this with policy and audit logs, but the technical
          ability exists, whereas with local processing it does not.
        </p>
        <p>
          <strong>Breach exposure.</strong>{" "}
          Your file is now part of someone else&rsquo;s attack
          surface. If they are compromised next year, a document you converted today can be in it.
        </p>
        <p>
          <strong>Jurisdiction.</strong>{" "}
          The server may be in a country with different rules about
          lawful access than yours. For anything covered by GDPR, HIPAA, or a client confidentiality
          clause, uploading may itself be the compliance problem — independently of whether anyone
          misuses the file.
        </p>
      </ContentSection>

      <ContentSection title="How to check whether a tool uploads your file">
        <p>
          You do not have to take anyone&rsquo;s word for it, including ours. This works on any file
          tool on the web and takes about half a minute.
        </p>
        <p>
          Open the page, then open your browser&rsquo;s developer tools (<strong>F12</strong>, or
          Ctrl+Shift+I / Cmd+Option+I) and select the <strong>Network</strong>{" "}
          tab. Clear it, then use
          the tool normally — choose your file and run the conversion.
        </p>
        <p>
          Now read the list. A tool that processes locally shows requests only for the page&rsquo;s own
          code, and nothing that carries your file. A tool that uploads shows a <code>POST</code> whose
          size is roughly the size of your file, usually to an endpoint with a name like{" "}
          <code>/upload</code> or <code>/convert</code>. That request is your document leaving. Sort the
          list by size if it&rsquo;s busy — an upload is almost always the largest entry.
        </p>
        <p>
          Two further signs worth knowing. If the result appears with no network activity at all after
          you pressed the button, the work happened on your machine. And if you can{" "}
          <strong>disconnect from the internet</strong>, reload nothing, and still convert a file
          successfully, the tool provably never needed a server.
        </p>
      </ContentSection>

      <ContentSection title="When uploading is perfectly fine">
        <p>
          It would be dishonest to imply every upload is a mistake. If the file is already public, or
          is a photo you were going to post anyway, the risk is close to zero and a server-side tool
          may well produce a better result — some conversions genuinely need software too heavy to run
          in a browser, such as OCR or full office-document layout engines.
        </p>
        <p>
          The distinction worth applying is simple: <strong>would you email this file to a stranger
          without thinking about it?</strong>{" "}
          If yes, upload it anywhere you like. If you hesitated,
          that hesitation is the answer.
        </p>
      </ContentSection>

      <ContentSection title="What “runs in your browser” actually means">
        <p>
          Modern browsers can do the work a conversion server used to. The page reads your file
          directly from disk into its own memory, transforms it there — often in a background thread so
          the interface stays responsive — and writes the result back to your downloads folder. Formats
          that need heavier machinery, like PDF or columnar data, are handled by compiled libraries
          delivered to the page as WebAssembly, which run locally the same way.
        </p>
        <p>
          The practical consequence is that there is no server endpoint to receive a file, so there is
          nothing to breach, subpoena or forget to delete. The trade-offs are real too: very large
          files are limited by your device&rsquo;s memory rather than a server&rsquo;s, and nothing is
          kept between visits.
        </p>
      </ContentSection>

      <ContentSection title="Where our own claim stops">
        <p>
          {SITE_NAME} processes every file locally, and the{" "}
          <Link href="/privacy" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            privacy page
          </Link>{" "}
          documents exactly how. But the same scepticism applies here, so here are the limits:
        </p>
        <p>
          The map-based geospatial tools <strong>do</strong>{" "}
          make one kind of off-origin request — they
          load background map images from a third-party tile provider. Those requests carry the
          coordinates of the map squares being displayed and nothing from your file. No other tool
          contacts anywhere.
        </p>
        <p>
          More fundamentally: any website that runs code in your browser is code you are trusting,
          delivered fresh on each visit. That is true of every tool on the web, this one included. It
          is why the Network tab above matters more than any assurance on a page like this one — and
          why we would rather you checked.
        </p>
      </ContentSection>

      <ContentSection title="Trying it">
        <p>
          Every tool here works the way this page describes. The{" "}
          <Link href="/pdf-studio" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            PDF tools
          </Link>
          ,{" "}
          <Link href="/data-studio" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            spreadsheet and data tools
          </Link>
          ,{" "}
          <Link href="/image-studio" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            image tools
          </Link>{" "}
          and{" "}
          <Link
            href="/geospatial-studio"
            className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
          >
            geospatial tools
          </Link>{" "}
          all run entirely on your device, with no account and nothing to install. Open the Network tab
          while you use one.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
