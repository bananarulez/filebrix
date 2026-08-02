import type { Metadata } from "next";
import Link from "next/link";
import { buildCategoryMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ContentPageLayout, ContentSection } from "@/components/site-pages/ContentPageLayout";
import { SITE_CONFIG } from "@/config/site";
import { tools } from "@/registry";
import { CATEGORIES } from "@/registry/categories";

export const metadata: Metadata = buildCategoryMetadata(
  `About ${SITE_NAME}`,
  `Who builds ${SITE_NAME}, why every tool runs locally in your browser, and what that means for your files.`,
  "/about"
);

/**
 * Deliberately concrete rather than an "our mission" page: it names the
 * operator, states the one architectural decision the whole product rests on,
 * and counts the tools from the registry so it can't drift.
 */
export default function AboutPage() {
  const { operator } = SITE_CONFIG;

  return (
    <ContentPageLayout
      title="About"
      intro={`${SITE_NAME} is a collection of file tools that run entirely inside your browser. Nothing you open is ever uploaded.`}
    >
      <ContentSection title="What this is">
        <p>
          {SITE_NAME} is {tools.length} tools for converting, viewing, editing and analyzing files —
          spreadsheets, PDFs, images, geospatial data and everyday developer utilities — grouped into{" "}
          {CATEGORIES.length} applications. There is no account to create, nothing to install, and no
          free tier to run out of.
        </p>
      </ContentSection>

      <ContentSection title="Why it runs in your browser">
        <p>
          Most online file tools work by uploading your file to a server, processing it there, and
          sending the result back. That means handing a stranger a copy of a document you may not own,
          trusting a deletion policy you can&rsquo;t verify.
        </p>
        <p>
          {SITE_NAME}{" "}
          does the processing on your own device instead, using the browser&rsquo;s own
          capabilities. Your file is read from disk into the page&rsquo;s memory, transformed there, and
          written back to your downloads folder. It never travels anywhere. This isn&rsquo;t a policy
          promise — there is no server endpoint that could receive a file even if something tried to
          send one. The{" "}
          <Link href="/privacy" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            privacy page
          </Link>{" "}
          explains exactly how that&rsquo;s enforced and names the one deliberate exception.
        </p>
      </ContentSection>

      <ContentSection title="The trade-offs, stated plainly">
        <p>
          Running locally isn&rsquo;t free of downsides, and it would be dishonest to pretend otherwise.
          Very large files are limited by your device&rsquo;s memory rather than by a server&rsquo;s.
          Some conversions that need heavyweight tooling — OCR, complex Office layouts — aren&rsquo;t
          offered at all, because doing them badly in a browser is worse than not doing them. And
          nothing is saved between visits: close the tab and the file is gone, which is the point, but
          it does mean there&rsquo;s no history to come back to.
        </p>
      </ContentSection>

      <ContentSection title="Who builds it">
        <p>
          {SITE_NAME} is built and maintained by {operator.legalName ?? operator.name}
          {operator.country ? `, based in ${operator.country}` : ""}.
          {operator.registrationNumber ? ` Registration number ${operator.registrationNumber}.` : ""}
        </p>
        {SITE_CONFIG.links.github && (
          <p>
            The source is available on{" "}
            <a
              href={SITE_CONFIG.links.github}
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            , so the claims on this site can be checked rather than taken on trust.
          </p>
        )}
        <p>
          Questions, feedback or bug reports are welcome on the{" "}
          <Link href="/contact" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            contact page
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
