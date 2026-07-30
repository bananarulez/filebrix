interface ProcessingProgressProps {
  percent?: number;
  message?: string;
}

export function ProcessingProgress({ percent, message }: ProcessingProgressProps) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}
        />
      </div>
      {message && <span className="text-sm text-gray-500">{message}</span>}
    </div>
  );
}
