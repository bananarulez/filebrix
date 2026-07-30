import type { ProcessingErrorCode } from "@/lib/errors/ProcessingError";

const RECOVERY_SUGGESTIONS = [
  "Close unused browser tabs to free up memory",
  "Try a desktop browser",
  "Use a device with more memory",
  "Try a smaller or simpler operation",
];

/**
 * Both codes mean "this device ran out of headroom for this file" — a
 * timeout is usually an out-of-memory kill the browser never reported as
 * an error — so the same four suggestions are the right ones for either.
 */
const CODES_WITH_SUGGESTIONS: ReadonlySet<ProcessingErrorCode> = new Set([
  "OUT_OF_MEMORY",
  "TIMEOUT",
]);

interface ErrorPanelProps {
  message: string;
  code?: ProcessingErrorCode;
}

/**
 * README.txt §31 — graceful failure must reassure the user their file was
 * never uploaded, and must never suggest an upload-based fallback.
 */
export function ErrorPanel({ message, code }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
    >
      <p className="font-medium">{message}</p>
      <p className="text-sm">Your file was never uploaded.</p>
      {code !== undefined && CODES_WITH_SUGGESTIONS.has(code) && (
        <ul className="list-inside list-disc text-sm">
          {RECOVERY_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
