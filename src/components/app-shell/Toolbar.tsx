"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { STUDIO_TAB_PANEL_ID, studioTabId } from "./tabIds";

export interface ToolbarModeOption<TMode extends string> {
  id: TMode;
  label: string;
}

interface ToolbarProps<TMode extends string> {
  modes: ToolbarModeOption<TMode>[];
  activeMode: TMode;
  /** Omitted when the page is locked to a single mode (an old per-format tool URL). */
  onModeChange?: (mode: TMode) => void;
  /** e.g. "CSV" — shown when the format is fixed for this page. */
  formatLabel?: string;
  /** Right-aligned slot, typically undo/redo controls. */
  right?: ReactNode;
}

/**
 * A Studio's top-level tab bar — the real ARIA Tabs pattern, not just tab
 * roles.
 *
 * It previously used `role="tablist"`/`role="tab"` with `aria-selected` and
 * nothing else, which is an incomplete (and therefore misleading)
 * implementation: a screen reader announced "tab" and told the user it
 * controlled a panel that didn't exist, and arrow keys did nothing. The
 * three pieces added here are what the pattern actually requires:
 *
 * - **`aria-controls` → `AppShell`'s panel**, which carries the matching
 *   `role="tabpanel"` and `aria-labelledby` (see `tabIds.ts` for why the
 *   ids are fixed strings rather than `useId`).
 * - **Roving tabindex** — only the selected tab is in the tab order, so Tab
 *   moves past the whole bar instead of through every mode.
 * - **Arrow/Home/End keys** move between tabs, which is how a tablist is
 *   expected to behave once it claims the role.
 *
 * Second-level pickers are deliberately *not* tabs — see `ActionPicker`.
 */
export function Toolbar<TMode extends string>({
  modes,
  activeMode,
  onModeChange,
  formatLabel,
  right,
}: ToolbarProps<TMode>) {
  const tablistRef = useRef<HTMLDivElement>(null);

  /**
   * Moves focus *and* selection, which is the "automatic activation" flavour
   * of the pattern — appropriate here because switching a Studio tab is
   * instant and lossless (the workspace keeps the loaded file), so there's
   * nothing expensive to trigger accidentally while arrowing through.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onModeChange) return;
    const currentIndex = modes.findIndex((mode) => mode.id === activeMode);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % modes.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex = (currentIndex - 1 + modes.length) % modes.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = modes.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = modes[nextIndex]!;
    onModeChange(next.id);
    tablistRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(studioTabId(next.id))}`)?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Application mode"
        onKeyDown={handleKeyDown}
        className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
      >
        {modes.map((mode) => {
          const selected = mode.id === activeMode;
          return (
            <button
              key={mode.id}
              id={studioTabId(mode.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={STUDIO_TAB_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              disabled={!onModeChange}
              onClick={() => onModeChange?.(mode.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-blue-100 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/40"
                  : "text-gray-500 hover:text-gray-900 disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      {formatLabel && (
        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {formatLabel}
        </span>
      )}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
