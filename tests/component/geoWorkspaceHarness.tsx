import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { GeoWorkspaceContext, type GeoWorkspaceValue } from "@/components/geo/GeoWorkspace";

/**
 * Mounts a single Geospatial Studio tool with a document already "loaded".
 *
 * The tools stopped owning their own file state and drop zone when the shared
 * `GeoWorkspace` took over (so a file survives tab switches). Driving the real
 * drop zone from a component test would now mean mocking the whole
 * detect → parse → summarize chain just to reach the code under test, so
 * these tests supply the workspace value directly instead. The full
 * drop-and-detect path is covered end-to-end in `tests/e2e/geo-tools.spec.ts`.
 */
export function renderInWorkspace(
  ui: ReactElement,
  overrides: Partial<GeoWorkspaceValue> = {}
): ReturnType<typeof render> {
  const value: GeoWorkspaceValue = {
    file: null,
    geojson: null,
    csvTable: null,
    sourceFormat: null,
    bbox: null,
    status: "ready",
    error: null,
    documentKey: 0,
    clear: () => {},
    loadFile: () => {},
    ...overrides,
  };

  return render(<GeoWorkspaceContext.Provider value={value}>{ui}</GeoWorkspaceContext.Provider>);
}

/** A throwaway `File` for tools that only need its name/size, not its bytes. */
export function makeFile(name: string, contents = "{}"): File {
  return new File([contents], name);
}
