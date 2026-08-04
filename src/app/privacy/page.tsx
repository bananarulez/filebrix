import type { Metadata } from "next";
import Link from "next/link";
import { buildCategoryMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ContentPageLayout, ContentSection } from "@/components/site-pages/ContentPageLayout";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = buildCategoryMetadata(
  `Privacy Policy — ${SITE_NAME}`,
  `${SITE_NAME} processes every file on your own device. No uploads, no accounts, no cookies, no tracking. Here's exactly what that means.`,
  "/privacy"
);

/**
 * The plain-language counterpart to `PRIVACY_ARCHITECTURE.md`.
 *
 * Every claim here is one the codebase actually enforces, and was checked
 * against it rather than written from the usual template — no cookies, no
 * web storage, no analytics transmission, no server endpoint that can
 * receive a file. That verifiability is the point: a policy asserting things
 * the code doesn't do is worse than no policy, and this product's entire
 * differentiation is that the claim can be checked.
 *
 * The advertising section is driven by `SITE_CONFIG.advertising`, so turning
 * an ad network on cannot silently leave this page saying otherwise.
 */
export default function PrivacyPage() {
  const { advertising, contact } = SITE_CONFIG;

  return (
    <ContentPageLayout
      title="Privacy Policy"
      path="/privacy"
      intro={`${SITE_NAME} is built so that there is almost nothing to write a privacy policy about. This page explains what that means in practice, and is honest about the exceptions.`}
      showLastUpdated
    >
      <ContentSection title="The short version">
        <p>
          Your files are never uploaded. They are read, processed and saved entirely by your own
          browser, on your own device. {SITE_NAME} has no accounts, sets no cookies, stores nothing on
          your device between visits, and operates no server that receives file contents.
        </p>
      </ContentSection>

      <ContentSection title="What happens to a file you open">
        <p>
          When you choose or drop a file, the browser hands the page a reference to it. Everything
          after that — detecting the format, parsing, converting, rendering a preview, producing the
          result — runs as code inside your browser tab. When you download the result, the browser
          writes it from memory straight to your disk.
        </p>
        <p>
          Nothing in that sequence crosses the network, and closing the tab discards all of it. There
          is no &ldquo;we delete your files after an hour&rdquo; promise here, because there is nowhere
          for a file to be stored in the first place.
        </p>
      </ContentSection>

      <ContentSection title="Cookies and local storage">
        <p>
          {SITE_NAME} sets no cookies. It does not use <code>localStorage</code>,{" "}
          <code>sessionStorage</code>, or IndexedDB. A file you are working on is held in the
          page&rsquo;s memory so that it survives moving between tools, and is discarded when you press
          Clear, load something else, or reload the page. Nothing is written to your device.
        </p>
      </ContentSection>

      <ContentSection title="Analytics">
        <p>
          No analytics or tracking service is connected. The application contains a small internal
          event system used during development, and it is deliberately built so that it structurally
          cannot carry file contents, filenames, cell values or anything derived from your data. At
          present those events are not transmitted anywhere at all.
        </p>
      </ContentSection>

      <ContentSection title="The one exception: map tiles">
        <p>
          The geospatial tools that display a map load background map images from a third-party map
          provider (CARTO, using OpenStreetMap data). Those requests contain only the coordinates of
          the map squares being displayed, and your browser&rsquo;s normal request information such as
          IP address — the same information any website you visit receives.
        </p>
        <p>
          Your geometry, coordinates and file contents are <strong>never</strong>{" "}
          included in those
          requests; the map is drawn on top of the tiles by your own browser. This is verified by an
          automated test that inspects every off-origin request the map tools make. Tools that
          don&rsquo;t show a map never contact the tile provider at all.
        </p>
        <p>
          If you want to check this — or any other file tool — for yourself rather than take it on
          trust,{" "}
          <Link
            href="/are-online-file-converters-safe"
            className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
          >
            here&rsquo;s how to tell whether a converter uploads your file
          </Link>
          , using your browser&rsquo;s own developer tools.
        </p>
      </ContentSection>

      <ContentSection title="Advertising">
        {advertising === "none" && (
          <p>
            No advertising network is currently connected. Some pages reserve blank space where an ad
            could later appear, but no third-party advertising script runs and no advertising cookie
            is set.
          </p>
        )}
        {advertising === "contextual" && (
          <p>
            Ads shown on this site are contextual: they are chosen from the content of the page, not
            from anything about you. The ad provider does not set advertising cookies and does not
            build a profile of your browsing.
          </p>
        )}
        {advertising === "personalized" && (
          <p>
            This site shows ads served by a third-party advertising network. That network may set
            cookies and use them to personalize the ads you see, in line with its own privacy policy.
            Where required, you will be asked for consent before any such cookie is set, and you can
            change your choice at any time.
          </p>
        )}
      </ContentSection>

      <ContentSection title="What is hosted by us">
        <p>
          Everything the application needs to run is served from this site&rsquo;s own domain,
          including the processing engines it loads on demand. Fonts, code and processing libraries are
          not fetched from third-party content delivery networks, so visiting a tool page does not
          announce your visit to anyone else.
        </p>
      </ContentSection>

      <ContentSection title="Server logs">
        <p>
          As with any website, the hosting provider that serves these pages may record standard
          request information such as IP address, timestamp and requested URL for operational and
          security purposes. That log covers the delivery of the web page itself and never contains
          file contents, because file contents are never sent.
        </p>
      </ContentSection>

      <ContentSection title="Your rights">
        <p>
          Since no personal data is collected, stored or processed by {SITE_NAME} itself, there is
          normally nothing to access, correct or delete. If you believe otherwise, or want to ask about
          any of the above, contact details are on the{" "}
          <Link href="/contact" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            contact page
          </Link>
          {contact.general.email ? (
            <>
              {" "}
              or email{" "}
              <a
                href={`mailto:${contact.general.email}`}
                className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              >
                {contact.general.email}
              </a>
            </>
          ) : null}
          .
        </p>
      </ContentSection>

      <ContentSection title="Verifying any of this">
        <p>
          You do not have to take these claims on trust. Open your browser&rsquo;s developer tools,
          switch to the Network tab, and use any tool on this site: you will see the page&rsquo;s own
          assets load, and no request carrying your file.
        </p>
        {SITE_CONFIG.links.github && (
          <p>
            The source code is public at{" "}
            <a
              href={SITE_CONFIG.links.github}
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              rel="noopener noreferrer"
              target="_blank"
            >
              {SITE_CONFIG.links.github.replace(/^https?:\/\//, "")}
            </a>
            , including the automated tests that assert no file ever leaves the browser.
          </p>
        )}
      </ContentSection>

      <ContentSection title="Changes to this policy">
        <p>
          If this policy changes, the date at the top of this page changes with it. Material changes —
          such as connecting an advertising network that uses cookies — will be reflected here before
          they take effect.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
