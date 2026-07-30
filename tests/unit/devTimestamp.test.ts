import { describe, expect, it } from "vitest";
import { describeTimestamp, parseDateTimeLocalInput, parseUnixInput } from "@/engines/developer/timestamp";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("parseUnixInput", () => {
  it("treats a 10-digit number as seconds", () => {
    const date = parseUnixInput("1700000000");
    expect(date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("treats a 13-digit number as milliseconds", () => {
    const date = parseUnixInput("1700000000000");
    expect(date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("handles the epoch and negative (pre-1970) values", () => {
    expect(parseUnixInput("0").toISOString()).toBe("1970-01-01T00:00:00.000Z");
    expect(parseUnixInput("-1").toISOString()).toBe("1969-12-31T23:59:59.000Z");
  });

  it("throws MALFORMED_FILE for non-numeric input", () => {
    expect(() => parseUnixInput("not a number")).toThrow(ProcessingError);
    expect(() => parseUnixInput("12.5")).toThrow(ProcessingError);
  });
});

describe("parseDateTimeLocalInput", () => {
  it("parses a datetime-local value", () => {
    const date = parseDateTimeLocalInput("2023-11-14T22:13:20");
    expect(date.getFullYear()).toBe(2023);
  });

  it("throws MALFORMED_FILE for an empty or invalid value", () => {
    expect(() => parseDateTimeLocalInput("")).toThrow(ProcessingError);
    expect(() => parseDateTimeLocalInput("not-a-date")).toThrow(ProcessingError);
  });
});

describe("describeTimestamp", () => {
  it("reports seconds, milliseconds, ISO, UTC and local consistently", () => {
    const date = new Date("2023-11-14T22:13:20.000Z");
    const info = describeTimestamp(date);
    expect(info.unixSeconds).toBe(1700000000);
    expect(info.unixMilliseconds).toBe(1700000000000);
    expect(info.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(info.utc).toContain("2023");
  });
});
