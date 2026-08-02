import type { Metadata } from "next";
import Link from "next/link";
import { buildCategoryMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ContentPageLayout, ContentSection } from "@/components/site-pages/ContentPageLayout";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = buildCategoryMetadata(
  `Terms of Service — ${SITE_NAME}`,
  `The terms for using ${SITE_NAME}'s free, browser-based file tools.`,
  "/terms"
);

/**
 * Short on purpose. There is no account, no payment, no stored data and no
 * service level to define, so most of a standard SaaS agreement would be
 * describing relationships that don't exist here. What remains is the part
 * that genuinely matters for a free tool that transforms people's files:
 * you keep your data, results aren't guaranteed, and keep your originals.
 *
 * This is a plain-language starting point, not legal advice — have it
 * reviewed if the site becomes commercially significant.
 */
export default function TermsPage() {
  const { operator, legal, contact } = SITE_CONFIG;
  const provider = operator.legalName ?? operator.name;

  return (
    <ContentPageLayout
      title="Terms of Service"
      intro={`${SITE_NAME} is free to use, with no account and no stored data. These terms are short because there isn't much to agree about.`}
      showLastUpdated
    >
      <ContentSection title="Using the service">
        <p>
          {SITE_NAME} is provided by {provider} free of charge, for anyone to use. There is no account
          to register, no subscription, and no usage limit other than what your own device can handle.
          By using the site you agree to these terms.
        </p>
      </ContentSection>

      <ContentSection title="Your files stay yours">
        <p>
          You keep all rights to every file you open and every result you produce. {SITE_NAME} claims
          no ownership of, and acquires no licence to, anything you process — which is straightforward
          here, because your files are never transmitted to us in the first place. See the{" "}
          <Link href="/privacy" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            privacy policy
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection title="Keep your originals">
        <p>
          These tools transform files. Conversions can be lossy, and some documents use features that
          can&rsquo;t survive a conversion — fonts, layout, embedded data or metadata may change.{" "}
          <strong>Always keep the original file</strong> and check the output before relying on it or
          discarding the source. Do not use {SITE_NAME} as the only copy of anything you can&rsquo;t
          afford to lose.
        </p>
      </ContentSection>

      <ContentSection title="No warranty">
        <p>
          The service is provided &ldquo;as is&rdquo;, without warranties of any kind, express or
          implied. {provider} does not warrant that the tools will be uninterrupted, error-free, or
          that any particular file will convert correctly or completely.
        </p>
      </ContentSection>

      <ContentSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, {provider} is not liable for any loss of data, loss
          of profits, or any indirect or consequential damages arising from using — or being unable to
          use — {SITE_NAME}. Since the service is free and processes files entirely on your own device,
          you are responsible for keeping backups of your own data.
        </p>
      </ContentSection>

      <ContentSection title="Acceptable use">
        <p>
          Don&rsquo;t use {SITE_NAME} to process material you have no right to, and don&rsquo;t attempt
          to attack, overload or interfere with the site or the people using it. Automated scraping or
          bulk re-hosting of the site is not permitted. Because the tools run in your browser, most
          &ldquo;abuse&rdquo; here would only affect your own device — but these terms still apply.
        </p>
      </ContentSection>

      <ContentSection title="Third-party components">
        <p>
          {SITE_NAME} is built on open-source software, and the geospatial map views display map tiles
          from a third-party provider under that provider&rsquo;s own terms, with attribution shown on
          the map. Those components remain the property of their respective owners.
        </p>
      </ContentSection>

      <ContentSection title="Availability and changes">
        <p>
          The service may change, and individual tools may be added, altered or withdrawn at any time
          without notice. These terms may also be updated; the date at the top of this page reflects
          the current version, and continuing to use the site after a change means accepting it.
        </p>
      </ContentSection>

      {legal.jurisdiction && (
        <ContentSection title="Governing law">
          <p>These terms are governed by the laws of {legal.jurisdiction}.</p>
        </ContentSection>
      )}

      <ContentSection title="Contact">
        <p>
          Questions about these terms can go to the{" "}
          <Link href="/contact" className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
            contact page
          </Link>
          {contact.general.email ? (
            <>
              {" "}
              or{" "}
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
    </ContentPageLayout>
  );
}
