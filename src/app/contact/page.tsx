import type { Metadata } from "next";
import { buildCategoryMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { ContentPageLayout, ContentSection } from "@/components/site-pages/ContentPageLayout";
import { SITE_CONFIG, activeContactChannels } from "@/config/site";

export const metadata: Metadata = buildCategoryMetadata(
  `Contact ${SITE_NAME}`,
  `How to reach ${SITE_NAME} — general questions, bug reports, feature requests and security disclosures.`,
  "/contact"
);

/**
 * Email and a public issue tracker, not a contact form.
 *
 * A form needs somewhere to POST, which would mean either adding a server
 * endpoint to a project whose whole architecture is "there is no server that
 * receives anything" (CLAUDE.md rule 1), or embedding a third-party form
 * service — new off-origin JavaScript on a site whose selling point is that
 * it doesn't have any, plus a CSP change and a new place user data is
 * processed. Neither is worth it for contact volume nobody has measured yet.
 *
 * Channels come from `config/site.ts` and hide themselves when unset, so an
 * address that doesn't exist is never published as a dead link.
 */
export default function ContactPage() {
  const channels = activeContactChannels();
  const { issues, github } = SITE_CONFIG.links;

  return (
    <ContentPageLayout
      title="Contact"
      path="/contact"
      intro="Three ways to get in touch, depending on what you need. Everything reaches the same person."
    >
      <div className="flex flex-col gap-6">
        {channels.map(({ key, label, channel }) => (
          <ContentSection key={key} title={label}>
            <p>{channel.description}</p>
            {channel.email ? (
              <p>
                <a
                  href={`mailto:${channel.email}`}
                  className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                >
                  {channel.email}
                </a>
              </p>
            ) : (
              key === "bugs" &&
              issues && (
                <p>
                  <a
                    href={issues}
                    className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open an issue on GitHub
                  </a>
                </p>
              )
            )}
          </ContentSection>
        ))}
      </div>

      <ContentSection title="What to include in a bug report">
        <p>
          The two things that make a report actionable: which tool you were using, and what kind of
          file it was. If a file failed to convert, describing it (format, rough size, where it came
          from) is usually enough — <strong>please don&rsquo;t send the file itself</strong>{" "}
          unless asked, and never send anything confidential. Since processing happens on your device, the
          file never reached anyone here in the first place, and it doesn&rsquo;t need to.
        </p>
      </ContentSection>

      <ContentSection title="Response times">
        <p>
          {SITE_NAME} is maintained by one person, so replies are best-effort rather than guaranteed.
          Security reports are read first.
        </p>
      </ContentSection>

      {github && (
        <ContentSection title="Source code">
          <p>
            The code is public at{" "}
            <a
              href={github}
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
              rel="noopener noreferrer"
              target="_blank"
            >
              {github.replace(/^https?:\/\//, "")}
            </a>
            .
          </p>
        </ContentSection>
      )}
    </ContentPageLayout>
  );
}
