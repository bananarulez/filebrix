"use client";

import { useState } from "react";

interface AdjustmentSliderProps {
  /** "Brightness", "Contrast", "Quality" — also the slider's accessible name. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Rendered after the number box, e.g. "%". */
  suffix?: string;
  /** Show "+12" rather than "12" for positive values, where the scale is signed. */
  showSign?: boolean;
}

/**
 * A slider paired with a number box, for the adjustments people tune by eye.
 *
 * Both halves exist for a measured reason. Brightness and contrast used to be
 * a bare slider with `step={5}`, so 41 positions across a ±100 range — too
 * coarse to make the small correction those tools are usually for. Dropping to
 * `step={1}` alone doesn't fix it: the slider had no width class, so it
 * rendered at the browser default of roughly 150px, which is **0.75px of
 * travel per unit**. You cannot land on a specific value by dragging that.
 *
 * So the slider is explicitly widened (1.3px per unit, draggable) *and* a
 * number box is provided, because the actual workflow is "try 12, look, try
 * 13" — and typing a value is the only way to repeat one exactly, or to come
 * back to the setting that looked right two attempts ago. Arrow keys on the
 * slider also move by exactly one step.
 *
 * The number box keeps its own draft string so a partially-typed value (or an
 * empty box mid-edit) doesn't fight the caller's state. It commits only when
 * the text parses to a number inside the range, and resets to the real value
 * on blur, so invalid text can't linger. External changes (dragging the
 * slider) flow back in via the render-time adjustment pattern rather than an
 * effect — `react-hooks/set-state-in-effect` correctly rejects the effect
 * version, and this is what React documents for deriving state from props.
 *
 * **Accessible names deliberately collide by prefix** ("Brightness" and
 * "Brightness value"), because both controls genuinely refer to the same
 * quantity and any honest label shares the word. Playwright's `getByLabel` is
 * substring and case-insensitive, so a query for either must pass
 * `{ exact: true }` — the same gotcha CLAUDE.md already records for buttons.
 */
export function AdjustmentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  showSign,
}: AdjustmentSliderProps) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const display = showSign && value > 0 ? `+${value}` : String(value);

  function commit(raw: string) {
    setDraft(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span>
        {label} ({display}
        {suffix})
      </span>
      <input
        type="range"
        className="w-56"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      <input
        type="number"
        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm tabular-nums dark:border-gray-700 dark:bg-gray-900"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => commit(event.target.value)}
        onBlur={() => setDraft(String(value))}
        aria-label={`${label} value`}
      />
      {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
    </div>
  );
}
