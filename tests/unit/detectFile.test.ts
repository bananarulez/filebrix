import { describe, expect, it } from "vitest";
import { detectFileType, tryDecodeAsText } from "@/lib/detect/detectFile";

function makeFile(bytes: number[] | string, name: string): File {
  const data = typeof bytes === "string" ? bytes : new Uint8Array(bytes);
  return new File([data], name);
}

describe("detectFileType", () => {
  it("detects a PDF by magic bytes regardless of extension", async () => {
    const file = makeFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34], "contract.bin");
    const result = await detectFileType(file);
    expect(result).toEqual({ format: "pdf", confidence: "signature" });
  });

  it("detects a PNG by magic bytes", async () => {
    const file = makeFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image.dat");
    const result = await detectFileType(file);
    expect(result.format).toBe("png");
  });

  it("detects JSON content when there is no binary signature", async () => {
    const file = makeFile('{"hello":"world"}', "data.txt");
    const result = await detectFileType(file);
    expect(result.format).toBe("json");
  });

  it("detects GeoJSON content specifically", async () => {
    const file = makeFile('{"type":"FeatureCollection","features":[]}', "data.txt");
    const result = await detectFileType(file);
    expect(result.format).toBe("geojson");
  });

  it("detects CSV content by delimiter consistency", async () => {
    const file = makeFile("a,b,c\n1,2,3\n4,5,6", "data.unknown");
    const result = await detectFileType(file);
    expect(result.format).toBe("csv");
  });

  it("detects a Parquet file by its PAR1 magic bytes regardless of extension", async () => {
    const file = makeFile([0x50, 0x41, 0x52, 0x31, 0x15, 0x00, 0x15, 0x02], "dataset.bin");
    const result = await detectFileType(file);
    expect(result).toEqual({ format: "parquet", confidence: "signature" });
  });

  it("falls back to extension when content is inconclusive", async () => {
    const file = makeFile([0x00, 0x01, 0x02], "archive.parquet");
    const result = await detectFileType(file);
    expect(result).toEqual({ format: "parquet", confidence: "extension" });
  });

  it("reports unknown when nothing matches", async () => {
    const file = makeFile([0x00, 0x01, 0x02], "mystery");
    const result = await detectFileType(file);
    expect(result.format).toBe("unknown");
  });

  it("detects a .sql file by extension (no distinctive magic bytes/content shape)", async () => {
    const file = makeFile("select id, name from users where active = 1;", "query.sql");
    const result = await detectFileType(file);
    expect(result).toEqual({ format: "sql", confidence: "extension" });
  });
});

describe("tryDecodeAsText", () => {
  it("returns the decoded text for clean UTF-8 content", () => {
    const bytes = new TextEncoder().encode("hello world");
    expect(tryDecodeAsText(bytes)).toBe("hello world");
  });

  it("returns null for binary data with control bytes", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]);
    expect(tryDecodeAsText(bytes)).toBeNull();
  });

  it("allows tab/newline/carriage-return whitespace", () => {
    const bytes = new TextEncoder().encode("line one\r\nline two\ttabbed");
    expect(tryDecodeAsText(bytes)).toBe("line one\r\nline two\ttabbed");
  });
});
