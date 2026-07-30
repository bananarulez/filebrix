"use client";

/**
 * A second-level action picker, visually matching `Toolbar`'s pill style but
 * simpler (no format badge/right slot) — used within a Studio's capability
 * tab (Pages/Convert/Metadata/Edit/...) to choose which of the existing,
 * unchanged tool components is mounted underneath it.
 *
 * Shared by all four Studio apps. Each Studio previously carried its own
 * byte-identical private copy of this component; they were consolidated
 * here once a fourth Studio would have added a fourth copy. A Studio still
 * owns its *own* action ids and labels (those are genuinely per-Studio
 * data) — only the rendering is shared.
 */
export function ActionPicker<T extends string>({
  options,
  labels,
  active,
  onChange,
  disabledReasons,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  active: T;
  onChange: (value: T) => void;
  /**
   * Actions that can't run against the current input, mapped to a plain
   * explanation shown on hover/focus. Optional and additive — the three
   * Studios that don't gate their actions pass nothing and are unaffected.
   */
  disabledReasons?: Partial<Record<T, string>>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Action"
      className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
    >
      {options.map((option) => {
        const reason = disabledReasons?.[option];
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={option === active}
            // `aria-disabled` rather than `disabled`: a truly disabled button
            // is skipped by keyboard focus and (in several browsers) fires no
            // mouse events at all, so its `title` tooltip never appears —
            // which would hide the very explanation of why it's unavailable.
            aria-disabled={reason ? true : undefined}
            title={reason}
            onClick={() => {
              if (reason) return;
              onChange(option);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              reason
                ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                : option === active
                  ? "bg-blue-100 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/40"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
