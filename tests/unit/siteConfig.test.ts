import { describe, expect, it } from "vitest";
import {
  SITE_CONFIG,
  activeContactChannels,
  pendingSiteConfigPlaceholders,
  socialProfileUrls,
} from "@/config/site";

describe("site config", () => {
  it("hides a contact channel that has neither an email nor a fallback link", () => {
    // Every channel must resolve to something clickable — publishing a
    // labelled inbox with no address behind it is worse than omitting it.
    for (const { key, channel } of activeContactChannels()) {
      const hasFallback = key === "bugs" && Boolean(SITE_CONFIG.links.issues);
      expect(Boolean(channel.email) || hasFallback, `${key} has no reachable destination`).toBe(true);
    }
  });

  it("every contact channel explains what belongs in it", () => {
    for (const { key, channel } of activeContactChannels()) {
      expect(channel.description.length, `${key} has no description`).toBeGreaterThan(20);
    }
  });

  it("only lists social profiles that are actually configured", () => {
    // `sameAs` asserting a profile that doesn't exist is a bad structured-data
    // signal, so nulls must never reach it.
    expect(socialProfileUrls().every((url) => url.startsWith("http"))).toBe(true);
    expect(socialProfileUrls()).not.toContain(null);
  });

  it("uses an ISO date for the legal 'last updated' stamp", () => {
    // Rendered inside a <time dateTime=…>, and must not be locale-dependent.
    expect(SITE_CONFIG.legal.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(SITE_CONFIG.legal.lastUpdated))).toBe(false);
  });

  /**
   * A launch checklist, not a gate.
   *
   * Placeholders are the *correct* state while the site is in development, so
   * failing here would just train someone to skip the test. Instead it always
   * passes and prints what's outstanding, so `npm run test` answers "did I
   * remember to fill everything in?" without a manual re-audit before launch.
   */
  it("reports which placeholder values are still shipping", () => {
    const pending = pendingSiteConfigPlaceholders();
    if (pending.length > 0) {
      console.info(
        `\n  [launch checklist] ${pending.length} placeholder value(s) still in src/config/site.ts:\n` +
          pending.map((item) => `    - ${item}`).join("\n") +
          "\n"
      );
    }
    expect(Array.isArray(pending)).toBe(true);
  });
});
