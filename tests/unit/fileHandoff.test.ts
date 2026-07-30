import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPendingFile, setPendingFile, takePendingFile } from "@/lib/fileHandoff";

function makeFile(name = "report.csv"): File {
  return new File(["a,b\n1,2"], name, { type: "text/csv" });
}

afterEach(() => {
  clearPendingFile();
  vi.useRealTimers();
});

describe("fileHandoff", () => {
  it("returns the file to the matching tool slug", () => {
    const file = makeFile();
    setPendingFile("csv-viewer", file);
    expect(takePendingFile("csv-viewer")).toBe(file);
  });

  it("is single-use — a second take for the same slug gets null", () => {
    setPendingFile("csv-viewer", makeFile());
    takePendingFile("csv-viewer");
    expect(takePendingFile("csv-viewer")).toBeNull();
  });

  it("never hands the file to a different tool slug", () => {
    setPendingFile("csv-viewer", makeFile());
    expect(takePendingFile("csv-to-json")).toBeNull();
    // and the real recipient can still claim it afterward
    expect(takePendingFile("csv-viewer")).not.toBeNull();
  });

  it("returns null when nothing has been set", () => {
    expect(takePendingFile("csv-viewer")).toBeNull();
  });

  it("a later setPendingFile call replaces an earlier unconsumed one", () => {
    const first = makeFile("first.csv");
    const second = makeFile("second.csv");
    setPendingFile("csv-viewer", first);
    setPendingFile("csv-viewer", second);
    expect(takePendingFile("csv-viewer")).toBe(second);
  });

  it("expires a handoff that's never consumed within a reasonable window", () => {
    vi.useFakeTimers();
    setPendingFile("csv-viewer", makeFile());
    vi.advanceTimersByTime(61_000);
    expect(takePendingFile("csv-viewer")).toBeNull();
  });

  it("clearPendingFile discards a pending handoff explicitly", () => {
    setPendingFile("csv-viewer", makeFile());
    clearPendingFile();
    expect(takePendingFile("csv-viewer")).toBeNull();
  });
});
