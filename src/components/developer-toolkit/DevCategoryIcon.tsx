import type { ReactNode } from "react";
import type { DevCategorySlug } from "@/registry/types";

const ICON_PATHS: Record<DevCategorySlug, ReactNode> = {
  text: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </>
  ),
  encoding: (
    <>
      <path d="M7 8h13M17 5l3 3-3 3" />
      <path d="M17 16H4M7 13l-3 3 3 3" />
    </>
  ),
  sql: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </>
  ),
  utilities: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.65 2.65a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4z" />
  ),
};

/** Simple stroke-based inline SVGs, one per Developer Toolkit category — no
 * icon library dependency for 5 glyphs (see CLAUDE.md's dependency
 * checklist). Sized/styled by the caller via className. */
export function DevCategoryIcon({ slug, className }: { slug: DevCategorySlug; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[slug]}
    </svg>
  );
}
