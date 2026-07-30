export function LocalProcessingBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span aria-hidden>🔒</span>
      <span>Processed locally — your file never leaves your device</span>
    </div>
  );
}
