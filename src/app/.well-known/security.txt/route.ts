import { SITE_CONFIG } from "@/config/site";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * `/.well-known/security.txt` — RFC 9116. The standard place a security
 * researcher looks before reporting a vulnerability, and a cheap, concrete
 * trust signal: it says there is someone to tell.
 *
 * A route handler rather than a static file in `public/` so the address
 * comes from `config/site.ts` like everything else — a security contact that
 * silently drifts out of date is worse than none, and `Expires` (required by
 * the RFC) has to be a real future date, which a checked-in file can't keep
 * being.
 *
 * This is not an API in the sense CLAUDE.md rule 1 forbids: it accepts no
 * input, reads no request body, and returns a fixed text document.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const { security } = SITE_CONFIG.contact;

  // RFC 9116 requires an expiry, and recommends under a year. Computed at
  // build time, so every deploy refreshes it.
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const lines = [
    "# Security contact for this site.",
    "# https://www.rfc-editor.org/rfc/rfc9116",
    "",
    ...(security.email ? [`Contact: mailto:${security.email}`] : []),
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${SITE_URL}/privacy`,
    "",
    "# Please don't run automated scans that degrade the service for others,",
    "# and don't test against data that isn't yours. Note that this site",
    "# processes files entirely in the browser and stores nothing server-side.",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
