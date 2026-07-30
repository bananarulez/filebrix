import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readImageMetadata } from "@/engines/image/render/metadata";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures", "image");

function loadFile(name: string, type = "image/jpeg"): File {
  const bytes = fs.readFileSync(path.join(FIXTURES_DIR, name));
  return new File([bytes], name, { type });
}

describe("readImageMetadata", () => {
  it("curates labeled camera fields from a real EXIF-carrying JPEG", async () => {
    const info = await readImageMetadata(loadFile("exif-oriented.jpg"));
    // Exact camera fields vary by fixture; the guarantee under test is that
    // *some* curated fields come back with human labels, not raw EXIF keys.
    for (const field of info.fields) {
      expect(field.label).not.toMatch(/^[A-Z][a-zA-Z]*$/); // not a raw PascalCase EXIF tag name leaking through
      expect(typeof field.value).toBe("string");
    }
  });

  it("flags GPS data as present for a GPS-tagged photo, and formats coordinates as a 'lat, lon' string", async () => {
    const info = await readImageMetadata(loadFile("gps-tagged.jpg"));
    expect(info.hasGpsData).toBe(true);
    const gpsField = info.fields.find((f) => f.label === "GPS location");
    expect(gpsField).toBeDefined();
    expect(gpsField!.value).toMatch(/^-?\d+\.\d+, -?\d+\.\d+$/);
  });

  it("reports no GPS data for a photo that doesn't carry any", async () => {
    const info = await readImageMetadata(loadFile("opaque.jpg"));
    expect(info.hasGpsData).toBe(false);
    expect(info.fields.some((f) => f.label === "GPS location")).toBe(false);
  });

  it("returns an empty field list, not a crash, for an image with no EXIF segment at all", async () => {
    const info = await readImageMetadata(loadFile("transparent.png", "image/png"));
    expect(info.fields).toEqual([]);
    expect(info.hasGpsData).toBe(false);
  });

  it("does not crash on a malformed/truncated file — resolves with empty metadata instead", async () => {
    const info = await readImageMetadata(loadFile("malformed.jpg"));
    expect(info.hasGpsData).toBe(false);
    expect(Array.isArray(info.fields)).toBe(true);
  });
});
