import type { FileFormat } from "@/registry/types";

/**
 * The file(s) a Studio currently has open, remembered per engine so they
 * survive navigating from one of that Studio's tool URLs to another.
 *
 * **The problem this solves.** Inside a Studio, switching tabs is React state
 * and the loaded file obviously survives. But every tool also has its own URL
 * (`/tools/csv-viewer`, `/convert/csv-to-json`, …), and following one of
 * those links unmounts the whole page — so a user who had already dropped a
 * file was silently asked to drop it again. Measured before building this:
 * tab switch kept the file, client-side navigation to another tool did not.
 *
 * **Why a module-scoped variable and not a route-group layout.** A
 * `layout.tsx` shared by a route group does persist across client-side
 * navigation, and that was the first plan — but `/tools/*` and `/convert/*`
 * each host tools from three different engines (Data, Image, PDF), so a
 * group per Studio would mean scattering those directories across four
 * groups, and navigation *between* groups remounts the layout anyway. This
 * is the same mechanism `lib/fileHandoff.ts` already proves works for the
 * homepage handoff, it's indifferent to route structure, and it's ~100 lines
 * instead of an 80-folder move.
 *
 * **What is stored, and for how long.** Live `File` references and their
 * already-detected formats — nothing is parsed, copied, serialized, or
 * written anywhere. Like `fileHandoff`, this is per-tab, in-memory only: a
 * hard reload or a new tab starts empty, which is both the privacy-safe
 * default and what the user expects. It is cleared explicitly when the user
 * clicks Clear, and expires on its own after `RECALL_EXPIRY_MS` so a file
 * from much earlier in a long session can't reappear unexpectedly.
 *
 * **Detected formats travel with the files** so a destination can decide
 * *synchronously* whether it can accept them. Without that, a page locked to
 * one format (`/convert/json-to-csv`) would adopt a carried-over CSV and
 * greet the user with "This looks like a CSV file, not JSON" — worse than
 * asking them to drop it again. See `recallWorkspaceFiles`' callers.
 */
export type WorkspaceKey = "data" | "pdf" | "image" | "geospatial";

export interface RecalledWorkspace {
  files: File[];
  /** Same order as `files`; `null` where detection didn't produce a known format. */
  formats: (FileFormat | null)[];
}

interface StoredWorkspace extends RecalledWorkspace {
  savedAt: number;
}

/**
 * Long enough to cover real cross-tool work (drop a CSV, view it, convert it,
 * validate it), short enough that a file from the beginning of a long session
 * doesn't silently reappear an hour later. Longer than `fileHandoff`'s 60s
 * because that one covers a single click, and this one covers a work session.
 */
const RECALL_EXPIRY_MS = 30 * 60_000;

const workspaces = new Map<WorkspaceKey, StoredWorkspace>();

export function rememberWorkspaceFiles(
  key: WorkspaceKey,
  files: File[],
  formats: (FileFormat | null)[]
): void {
  if (files.length === 0) {
    workspaces.delete(key);
    return;
  }
  workspaces.set(key, { files, formats, savedAt: Date.now() });
}

/**
 * Peeks — deliberately *not* single-use, unlike `takePendingFile`. This is
 * "what is currently open", so several pages in a row may adopt the same
 * file; a one-shot read would mean only the first navigation kept it.
 */
export function recallWorkspaceFiles(key: WorkspaceKey): RecalledWorkspace | null {
  const stored = workspaces.get(key);
  if (!stored) return null;
  if (Date.now() - stored.savedAt > RECALL_EXPIRY_MS) {
    workspaces.delete(key);
    return null;
  }
  return { files: stored.files, formats: stored.formats };
}

/** Called when the user clicks Clear — the explicit "I'm done with this file" signal. */
export function forgetWorkspaceFiles(key: WorkspaceKey): void {
  workspaces.delete(key);
}

/** Test helper: drops every remembered workspace, so one test can't leak into the next. */
export function clearAllWorkspaceFiles(): void {
  workspaces.clear();
}
