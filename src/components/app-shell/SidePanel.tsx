import type { ReactNode } from "react";

interface SidePanelSectionProps {
  title: string;
  children: ReactNode;
}

/** One titled section of the side panel — an app places a few of these in a row above the main preview (e.g. Edit mode: "Add operation" + "Applied edits"; Analyze mode: "Schema" + "Statistics"). Fixed-ish width so the row wraps naturally instead of each section stretching edge to edge. */
export function SidePanelSection({ title, children }: SidePanelSectionProps) {
  return (
    <section className="flex w-full flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:w-80 dark:border-gray-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      {children}
    </section>
  );
}
