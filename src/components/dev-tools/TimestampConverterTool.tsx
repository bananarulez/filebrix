"use client";

import { useEffect, useMemo, useState } from "react";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import {
  describeTimestamp,
  parseDateTimeLocalInput,
  parseUnixInput,
  type TimestampInfo,
} from "@/engines/developer/timestamp";

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}

function InfoGrid({ info }: { info: TimestampInfo }) {
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
      <InfoRow label="Unix seconds" value={String(info.unixSeconds)} />
      <InfoRow label="Unix milliseconds" value={String(info.unixMilliseconds)} />
      <InfoRow label="ISO 8601" value={info.iso} />
      <InfoRow label="UTC" value={info.utc} />
      <InfoRow label="Local time" value={info.local} />
    </dl>
  );
}

/**
 * `Date.now()` is only ever read inside `useEffect` — reading it during the
 * initial render would bake a server-rendered timestamp into the markup
 * that immediately mismatches the client's clock on hydration.
 */
function useLiveNow(): TimestampInfo | null {
  const [info, setInfo] = useState<TimestampInfo | null>(null);
  useEffect(() => {
    const tick = () => setInfo(describeTimestamp(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return info;
}

export function TimestampConverterTool() {
  const now = useLiveNow();

  const [timestampInput, setTimestampInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  const timestampResult = useMemo(() => {
    if (!timestampInput.trim()) return null;
    try {
      return { info: describeTimestamp(parseUnixInput(timestampInput)), error: null as string | null };
    } catch (cause) {
      return { info: null, error: cause instanceof ProcessingError ? cause.message : "Invalid timestamp." };
    }
  }, [timestampInput]);

  const dateResult = useMemo(() => {
    if (!dateInput) return null;
    try {
      return { info: describeTimestamp(parseDateTimeLocalInput(dateInput)), error: null as string | null };
    } catch (cause) {
      return { info: null, error: cause instanceof ProcessingError ? cause.message : "Invalid date." };
    }
  }, [dateInput]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-sm font-medium">Current time</h3>
        {now ? <InfoGrid info={now} /> : <p className="text-sm text-gray-500">Loading…</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="timestamp-input" className="text-sm font-medium">
          Unix timestamp → Date
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="timestamp-input"
            type="text"
            inputMode="numeric"
            value={timestampInput}
            onChange={(event) => setTimestampInput(event.target.value)}
            placeholder="1700000000 (seconds) or 1700000000000 (ms)"
            className="min-w-64 flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={() => setTimestampInput(String(Math.floor(Date.now() / 1000)))}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Use current time
          </button>
        </div>
        {timestampResult?.error && <p className="text-sm text-red-600 dark:text-red-400">{timestampResult.error}</p>}
        {timestampResult?.info && <InfoGrid info={timestampResult.info} />}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="date-input" className="text-sm font-medium">
          Date → Unix timestamp
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="date-input"
            type="datetime-local"
            step={1}
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={() => setDateInput(toDateTimeLocalValue(new Date()))}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Use current time
          </button>
        </div>
        {dateResult?.error && <p className="text-sm text-red-600 dark:text-red-400">{dateResult.error}</p>}
        {dateResult?.info && <InfoGrid info={dateResult.info} />}
      </div>
    </div>
  );
}
