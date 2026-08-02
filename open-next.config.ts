import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * No incremental cache, no queue, no tag cache — every route in this app is
 * prerendered at build time and nothing revalidates (`npm run build` reports
 * every route as static). The adapter's defaults are therefore exactly right;
 * adding a cache backend would provision Cloudflare resources that nothing
 * would ever read from.
 */
export default defineCloudflareConfig();
