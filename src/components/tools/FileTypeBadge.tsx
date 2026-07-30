export function FileTypeBadge({ format }: { format: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {format}
    </span>
  );
}
