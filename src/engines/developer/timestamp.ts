import { ProcessingError } from "@/lib/errors/ProcessingError";

export interface TimestampInfo {
  unixSeconds: number;
  unixMilliseconds: number;
  iso: string;
  utc: string;
  local: string;
}

export function describeTimestamp(date: Date): TimestampInfo {
  return {
    unixSeconds: Math.floor(date.getTime() / 1000),
    unixMilliseconds: date.getTime(),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(),
  };
}

/** Accepts a whole number of seconds or milliseconds — 13+ digit magnitudes are treated as milliseconds, matching how most systems emit timestamps. */
export function parseUnixInput(raw: string): Date {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "Enter a whole number of seconds or milliseconds since the Unix epoch."
    );
  }
  const value = Number(trimmed);
  const isMilliseconds = Math.abs(value) >= 1e12;
  const date = new Date(isMilliseconds ? value : value * 1000);
  if (Number.isNaN(date.getTime())) {
    throw new ProcessingError("MALFORMED_FILE", "That number doesn't correspond to a valid date.");
  }
  return date;
}

export function parseDateTimeLocalInput(raw: string): Date {
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) {
    throw new ProcessingError("MALFORMED_FILE", "Enter a valid date and time.");
  }
  return date;
}
