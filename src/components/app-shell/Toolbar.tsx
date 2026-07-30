import type { ReactNode } from "react";

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

/** Generic mode switcher + format badge, shared across every consolidated application. */
export function Toolbar<TMode extends string>({
  modes,
  activeMode,
  onModeChange,
  formatLabel,
  right,
}: ToolbarProps<TMode>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label="Application mode" className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={mode.id === activeMode}
            disabled={!onModeChange}
            onClick={() => onModeChange?.(mode.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode.id === activeMode
                ? "bg-blue-100 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/40"
                : "text-gray-500 hover:text-gray-900 disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {mode.label}
          </button>
        ))}
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
