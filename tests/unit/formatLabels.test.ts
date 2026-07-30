import { describe, expect, it } from "vitest";
import { describeDetectedFormat, FILE_FORMAT_LABELS } from "@/lib/detect/formatLabels";
import type { FileFormat } from "@/registry/types";

const ALL_FORMATS: FileFormat[] = [
  "csv",
  "tsv",
  "xlsx",
  "xls",
  "ods",
  "json",
  "xml",
  "yaml",
  "parquet",
  "arrow",
  "pdf",
  "txt",
  "markdown",
  "html",
  "png",
  "jpg",
  "webp",
  "avif",
  "svg",
  "gif",
  "heic",
  "geojson",
  "kml",
  "gpx",
  "shapefile",
  "sql",
];

describe("FILE_FORMAT_LABELS", () => {
  it("has a non-empty, human-readable label for every FileFormat", () => {
    for (const format of ALL_FORMATS) {
      expect(FILE_FORMAT_LABELS[format]).toBeTruthy();
      expect(FILE_FORMAT_LABELS[format]).not.toBe(format);
    }
  });
});

describe("describeDetectedFormat", () => {
  it("returns the human label for a known format", () => {
    expect(describeDetectedFormat("xlsx")).toBe("Excel spreadsheet");
    expect(describeDetectedFormat("webp")).toBe("WebP image");
  });

  it("returns a distinct message for an unknown format", () => {
    expect(describeDetectedFormat("unknown")).toBe("Unknown file type");
  });
});
