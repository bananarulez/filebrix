import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllWorkspaceFiles,
  forgetWorkspaceFiles,
  recallWorkspaceFiles,
  rememberWorkspaceFiles,
} from "@/lib/workspaceFiles";

function file(name: string): File {
  return new File(["stub"], name);
}

beforeEach(() => clearAllWorkspaceFiles());
afterEach(() => vi.useRealTimers());

describe("workspaceFiles", () => {
  it("hands back the same File objects, not copies", () => {
    const original = file("sample.csv");
    rememberWorkspaceFiles("data", [original], ["csv"]);
    // Identity matters: the destination re-parses the *same* file rather than
    // anything serialized, which is what keeps this a memory-only mechanism.
    expect(recallWorkspaceFiles("data")!.files[0]).toBe(original);
  });

  it("keeps each engine's workspace separate", () => {
    rememberWorkspaceFiles("data", [file("a.csv")], ["csv"]);
    rememberWorkspaceFiles("pdf", [file("b.pdf")], ["pdf"]);

    expect(recallWorkspaceFiles("data")!.files[0].name).toBe("a.csv");
    expect(recallWorkspaceFiles("pdf")!.files[0].name).toBe("b.pdf");
    expect(recallWorkspaceFiles("image")).toBeNull();
  });

  it("peeks rather than consumes — several pages in a row may adopt the same file", () => {
    rememberWorkspaceFiles("data", [file("a.csv")], ["csv"]);
    expect(recallWorkspaceFiles("data")).not.toBeNull();
    expect(recallWorkspaceFiles("data")).not.toBeNull();
    // Deliberately unlike fileHandoff's single-use takePendingFile: a one-shot
    // read would mean only the first navigation kept the file.
  });

  it("carries the detected format, so a destination can refuse a file it can't use", () => {
    rememberWorkspaceFiles("data", [file("a.csv")], ["csv"]);
    expect(recallWorkspaceFiles("data")!.formats).toEqual(["csv"]);
  });

  it("forgets on an explicit Clear", () => {
    rememberWorkspaceFiles("pdf", [file("a.pdf")], ["pdf"]);
    forgetWorkspaceFiles("pdf");
    expect(recallWorkspaceFiles("pdf")).toBeNull();
  });

  it("treats an empty file list as a clear rather than storing nothing-ness", () => {
    rememberWorkspaceFiles("image", [file("a.png")], ["png"]);
    rememberWorkspaceFiles("image", [], []);
    expect(recallWorkspaceFiles("image")).toBeNull();
  });

  it("expires, so a file from the start of a long session can't resurface much later", () => {
    vi.useFakeTimers();
    rememberWorkspaceFiles("geospatial", [file("a.geojson")], ["geojson"]);

    vi.advanceTimersByTime(29 * 60_000);
    expect(recallWorkspaceFiles("geospatial")).not.toBeNull();

    vi.advanceTimersByTime(2 * 60_000);
    expect(recallWorkspaceFiles("geospatial")).toBeNull();
  });
});
