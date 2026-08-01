"use client";

import { useRef, type KeyboardEvent } from "react";

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
 *
 * **Why this is a radio group and not a second tablist.** It used to render
 * `role="tablist"`/`role="tab"`, which was wrong in a way that mattered: a
 * `tab` must own a `tabpanel` via `aria-controls`, and this control has no
 * panel to own. The region below it is *shared* — the Studio's one drop zone
 * (`PdfFilePanel`/`ImageFilePanel`/`GeoFilePanel`) sits between this picker
 * and the tool it selects, and belongs to every action equally. So the
 * picker doesn't switch between sibling panels the way the `Toolbar` above
 * it does; it picks which variant of one already-labelled panel is shown.
 * That is precisely a radio group: "a set of checkable buttons where no more
 * than one is checked at a time." The `Toolbar` remains a real tablist, with
 * a real `tabpanel` — see `Toolbar.tsx`.
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
   * explanation shown on hover/focus. Optional and additive — the Studios
   * that don't gate their actions pass nothing and are unaffected.
   */
  disabledReasons?: Partial<Record<T, string>>;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  /** Arrow keys move to the next *selectable* option, skipping gated ones. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    const currentIndex = options.indexOf(active);
    if (currentIndex === -1) return;

    const wrap = (index: number) => ((index % options.length) + options.length) % options.length;
    for (let offset = 1; offset <= options.length; offset += 1) {
      const candidate = options[wrap(currentIndex + step * offset)]!;
      if (disabledReasons?.[candidate]) continue;
      event.preventDefault();
      onChange(candidate);
      groupRef.current?.querySelector<HTMLButtonElement>(`[data-action="${CSS.escape(candidate)}"]`)?.focus();
      return;
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Action"
      onKeyDown={handleKeyDown}
      className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
    >
      {options.map((option) => {
        const reason = disabledReasons?.[option];
        const checked = option === active;
        return (
          <button
            key={option}
            data-action={option}
            type="button"
            role="radio"
            aria-checked={checked}
            // Roving tabindex: only the checked option is in the tab order,
            // so Tab moves past the group rather than through every action.
            tabIndex={checked ? 0 : -1}
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
                : checked
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
