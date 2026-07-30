/**
 * In-memory, single-use, per-tab handoff of an already-selected `File` from
 * the homepage's "Drop any file" flow to whichever tool page the user picks
 * next — so they never have to re-select a file they've already dropped.
 *
 * This is a plain module-scoped variable, not localStorage/sessionStorage/a
 * server session: Next.js's <Link> performs a client-side route transition
 * that keeps the JS module registry alive, so this survives the navigation,
 * but a hard reload or a new tab starts with a clean module and gets
 * `null` back — the safe, expected fallback (the destination tool just
 * shows its normal empty drop zone). File contents are never written to
 * disk, storage, or the network by this mechanism.
 */
interface PendingHandoff {
  toolSlug: string;
  file: File;
  createdAt: number;
}

/** Generous enough for a real click-through, short enough that a stale, never-consumed handoff can't resurface much later in the same session. */
const HANDOFF_EXPIRY_MS = 60_000;

let pending: PendingHandoff | null = null;

export function setPendingFile(toolSlug: string, file: File): void {
  pending = { toolSlug, file, createdAt: Date.now() };
}

/** Single-use: returns the file at most once, and only to the tool it was addressed to. Anyone else — including a second call for the same tool — gets `null`. */
export function takePendingFile(toolSlug: string): File | null {
  if (!pending || pending.toolSlug !== toolSlug) return null;
  const current = pending;
  pending = null;
  if (Date.now() - current.createdAt > HANDOFF_EXPIRY_MS) return null;
  return current.file;
}

/** Exposed for tests and for an explicit "never mind" action; not required for normal use since `takePendingFile` already clears on read. */
export function clearPendingFile(): void {
  pending = null;
}
