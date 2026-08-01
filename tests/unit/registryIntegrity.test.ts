import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tools, getToolBySlug, getToolUrl } from "@/registry";
import { STUDIOS, getStudioConfig } from "@/registry/studios";
import { getAllCapabilities, getToolsByCapability, getToolCapability } from "@/registry/capabilities";

const APP_DIR = path.resolve(__dirname, "..", "..", "src", "app");

/**
 * These guard the exact class of bug an SEO audit found in production data:
 * `csv-to-sql-insert`'s registry `slug` didn't match its actual page folder
 * (`app/convert/csv-to-sql/`), so every generated link — sitemap, related
 * tools, category pages, homepage search — pointed at a 404 while the real
 * page sat at a different URL with a canonical tag pointing at that same
 * 404. Nothing else in the test suite would have caught a future instance
 * of this, since each tool's own page test only checks that its slug
 * resolves — never that the resolved URL is where the file actually lives.
 */
describe("registry integrity", () => {
  it("every tool's routeGroup + slug resolves to a real page.tsx on disk", () => {
    const missing = tools
      .map((tool) => ({ tool, pagePath: path.join(APP_DIR, tool.routeGroup, tool.slug, "page.tsx") }))
      .filter(({ pagePath }) => !fs.existsSync(pagePath));

    expect(
      missing.map(({ tool, pagePath }) => `${tool.id} -> ${getToolUrl(tool)} (expected ${pagePath})`),
      "Registry slug/routeGroup doesn't match an actual page file — see the comment above for why this matters."
    ).toEqual([]);
  });

  it("has no two tools sharing the same slug within a route group (URL collision)", () => {
    const seen = new Map<string, string[]>();
    for (const tool of tools) {
      const key = `${tool.routeGroup}/${tool.slug}`;
      seen.set(key, [...(seen.get(key) ?? []), tool.id]);
    }
    const collisions = Array.from(seen.entries()).filter(([, ids]) => ids.length > 1);
    expect(collisions).toEqual([]);
  });

  it("every relatedTools entry resolves to a real, currently-registered tool", () => {
    const broken: string[] = [];
    for (const tool of tools) {
      for (const relatedSlug of tool.relatedTools) {
        if (!getToolBySlug(relatedSlug)) broken.push(`${tool.id} -> "${relatedSlug}"`);
        if (relatedSlug === tool.slug) broken.push(`${tool.id} references itself`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every tool has at least a minimal FAQ (avoids thin-content pages)", () => {
    const thin = tools.filter((tool) => (tool.faq?.length ?? 0) < 2).map((tool) => tool.id);
    expect(thin).toEqual([]);
  });

  it("every tool has a working page behind it, not a placeholder registry entry (README.txt §53)", () => {
    // A page.tsx must actually render something recognizable as this tool,
    // not just exist — cross-check that it imports/renders content tied to
    // the tool rather than being an empty stub.
    for (const tool of tools) {
      const pagePath = path.join(APP_DIR, tool.routeGroup, tool.slug, "page.tsx");
      const source = fs.readFileSync(pagePath, "utf8");
      expect(source, `${tool.id}'s page looks empty/placeholder`).toMatch(/ToolPageLayout/);
    }
  });
});

/**
 * The capability layer (`/{studio}/{capability}`) is derived from three
 * separate registry facts — a Studio's `actions`, each action's
 * `indexDescription`, and each tool's `appEntry.mode`/`capability` — that
 * TypeScript can't cross-check against each other. These assert the
 * invariants that keep the generated pages, the sitemap, and each Studio's
 * capability links from silently disagreeing about which pages exist.
 */
describe("capability index integrity", () => {
  it("every capability with tools has an indexDescription (so it gets a real index page)", () => {
    const missing: string[] = [];
    for (const studio of STUDIOS) {
      for (const action of studio.actions) {
        const toolCount = getToolsByCapability(studio.categorySlug, action.id).length;
        if (toolCount > 0 && !action.indexDescription) {
          missing.push(`${studio.categorySlug}/${action.id} has ${toolCount} tool(s) but no indexDescription`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("never generates an index page for a capability with no tools (thin content)", () => {
    const empty = getAllCapabilities()
      .filter((capability) => capability.tools.length === 0)
      .map((capability) => capability.path);
    expect(empty).toEqual([]);
  });

  it("every generated capability path resolves to a real page.tsx on disk", () => {
    const missing = getAllCapabilities()
      .map((capability) => ({
        capability,
        pagePath: path.join(APP_DIR, capability.categorySlug, capability.id, "page.tsx"),
      }))
      .filter(({ pagePath }) => !fs.existsSync(pagePath));

    expect(missing.map(({ capability }) => capability.path)).toEqual([]);
  });

  it("a tool never declares both appEntry.mode and its own capability (duplicated, driftable data)", () => {
    const both = tools
      .filter((tool) => tool.appEntry?.mode !== undefined && tool.capability !== undefined)
      .map((tool) => tool.id);
    expect(both).toEqual([]);
  });

  it("every Studio-owned tool is reachable from exactly one capability index page", () => {
    const capabilities = getAllCapabilities();
    const studioEngines = new Set(STUDIOS.flatMap((studio) => studio.relatedEngines));
    const orphans: string[] = [];

    for (const tool of tools) {
      if (!studioEngines.has(tool.engine)) continue; // Developer Toolkit — indexed by devCategory instead.
      const appearsIn = capabilities.filter((capability) =>
        capability.tools.some((candidate) => candidate.id === tool.id)
      );
      if (appearsIn.length !== 1) {
        orphans.push(`${tool.id} (capability=${getToolCapability(tool)}) appears on ${appearsIn.length} index pages`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("every Developer Toolkit tool is reachable from exactly one sub-category page", () => {
    const uncategorized = tools
      .filter((tool) => tool.engine === "developer" && !tool.devCategory)
      .map((tool) => tool.id);
    expect(uncategorized).toEqual([]);
  });
  it("no Studio's rendered copy leaks an unresolved {placeholder}", () => {
    // getStudioConfig is the one door every consumer goes through, so a
    // placeholder surviving it would reach both the page and the FAQPage
    // JSON-LD. Catches a typo'd token as well as a forgotten substitution.
    const leaks: string[] = [];
    for (const studio of STUDIOS) {
      const config = getStudioConfig(studio.categorySlug);
      const copy = [config.description, ...config.faq.flatMap((item) => [item.question, item.answer])];
      for (const text of copy) {
        if (/\{[a-zA-Z]/.test(text)) leaks.push(`${studio.categorySlug}: ${text}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("a Studio's stated tool count matches the registry", () => {
    // The reason `{toolCount}` exists: these numbers were hand-written and
    // Geospatial Studio shipped "11" for a while after it had grown to 15.
    for (const studio of STUDIOS) {
      const config = getStudioConfig(studio.categorySlug);
      const expected = studio.relatedEngines.reduce(
        (total, engine) => total + tools.filter((tool) => tool.engine === engine).length,
        0
      );
      expect(config.toolCount, studio.categorySlug).toBe(expected);

      for (const item of config.faq) {
        const stated = /every one of the (\d+) individual/.exec(item.answer);
        if (stated) expect(Number(stated[1]), `${studio.categorySlug} FAQ`).toBe(expected);
      }
    }
  });
});
