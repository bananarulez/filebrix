// Wording is deliberate — README.txt §30 bans "Uploading" anywhere in the UI.
export type ProcessingState =
  | "idle"
  | "opening-file"
  | "reading"
  | "analyzing-schema"
  | "preparing-preview"
  | "processing"
  | "converting"
  | "preparing-download"
  | "done"
  /** Data is loaded and the user is actively viewing/interacting with it (viewer tools, not one-shot conversions). */
  | "ready"
  | "error";

const LABELS: Record<ProcessingState, string> = {
  idle: "",
  "opening-file": "Opening file…",
  reading: "Reading locally…",
  "analyzing-schema": "Analyzing schema…",
  "preparing-preview": "Preparing preview…",
  processing: "Processing…",
  converting: "Converting…",
  "preparing-download": "Preparing download…",
  done: "Done",
  ready: "",
  error: "Something went wrong",
};

export function ProcessingStatus({ state }: { state: ProcessingState }) {
  if (state === "idle" || state === "ready") return null;
  return (
    <p className="text-sm font-medium" role="status">
      {LABELS[state]}
    </p>
  );
}
