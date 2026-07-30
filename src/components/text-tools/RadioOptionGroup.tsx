interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioOptionGroupProps<T extends string> {
  legend: string;
  name: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Shared inline radio-button group — used as `TextTransformTool`'s
 * `extraControls` by Sort Lines (direction), Normalize Line Endings
 * (target), and Case Converter (mode), rather than three near-identical
 * bespoke option pickers. */
export function RadioOptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: RadioOptionGroupProps<T>) {
  return (
    <fieldset className="flex flex-wrap items-center gap-4 text-sm">
      <legend className="w-full text-sm font-medium sm:w-auto">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-1.5">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
