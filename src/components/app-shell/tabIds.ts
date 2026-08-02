/**
 * The ids wiring a Studio's tab bar to its tab panel.
 *
 * `Toolbar` renders the tabs and `AppShell` renders the panel, and ARIA
 * requires them to reference each other by id (`aria-controls` one way,
 * `aria-labelledby` the other). They're two sibling components that never
 * see each other's props, so the ids live here rather than being generated
 * with `useId` and threaded through.
 *
 * Fixed strings are safe because exactly one `AppShell` renders per page —
 * every Studio page mounts a single Studio app. They're also stable across
 * server and client render (no hydration mismatch) and readable in tests.
 */
export const STUDIO_TAB_PANEL_ID = "studio-tabpanel";

export function studioTabId(mode: string): string {
  return `studio-tab-${mode}`;
}
