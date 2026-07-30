import { describe, expect, it } from "vitest";
import { getAppNavItems } from "@/registry/navigation";
import { CATEGORIES } from "@/registry/categories";
import { STUDIOS } from "@/registry/studios";
import { DEV_CATEGORIES } from "@/registry/devCategories";

describe("getAppNavItems", () => {
  const items = getAppNavItems();

  it("returns exactly the 5 Applications, in CATEGORIES order, each linking to its own page", () => {
    expect(items.map((item) => item.slug)).toEqual(CATEGORIES.map((category) => category.slug));
    expect(items.map((item) => item.name)).toEqual(CATEGORIES.map((category) => category.name));
    for (const item of items) {
      expect(item.href).toBe(`/${item.slug}`);
    }
  });

  it("previews each Studio's own actions as unlinked capability labels (not separately addressable by URL)", () => {
    for (const studio of STUDIOS) {
      const item = items.find((i) => i.slug === studio.categorySlug);
      expect(item?.capabilities).toEqual(studio.actions.map((action) => ({ label: action.label })));
      expect(item?.capabilities.every((capability) => capability.href === undefined)).toBe(true);
    }
  });

  it("previews Developer Toolkit's real sub-category pages as linked capabilities", () => {
    const devToolkit = items.find((i) => i.slug === "developer-tools");
    expect(devToolkit?.capabilities).toEqual(
      DEV_CATEGORIES.map((devCategory) => ({
        label: devCategory.name,
        href: `/developer-tools/${devCategory.slug}`,
      }))
    );
  });

  it("bounds nav size by Applications and their capabilities, not by total tool count", () => {
    // 5 Applications, each with a small, fixed capability count — this shape
    // holds regardless of how many tools exist underneath any of them.
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.capabilities.length).toBeLessThanOrEqual(6);
    }
  });
});
