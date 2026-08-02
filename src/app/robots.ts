import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Required by `output: "export"`: without it the build fails with
 * "export const dynamic = \"force-static\" ... not configured on route".
 * Nothing here reads a request — the content is derived entirely from the
 * registry at build time — so being static is a statement of fact, not a
 * constraint. `app/.well-known/security.txt/route.ts` carries it for the
 * same reason.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
