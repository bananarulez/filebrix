"use client";

import { useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { computeHashes, type HashResult } from "@/engines/developer/hash";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown): ErrorState {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: "Something went wrong computing these hashes." };
}

function HashRow({ result }: { result: HashResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the hex is still selectable/visible, so this is non-fatal.
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {result.algorithm}
          {result.algorithm === "SHA-1" && (
            <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">
              legacy — not collision-resistant
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <code className="break-all font-mono text-xs text-gray-700 dark:text-gray-300">{result.hex}</code>
    </div>
  );
}

/** Computes SHA-1/256/384/512 simultaneously via the native Web Crypto API — see engines/developer/hash.ts for why MD5 isn't offered. */
export function HashGeneratorTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<HashResult[] | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  async function handleCompute() {
    setIsComputing(true);
    setError(null);
    try {
      setResults(await computeHashes(input));
    } catch (cause) {
      setError(errorFrom(cause));
      setResults(null);
    } finally {
      setIsComputing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="hash-input" className="text-sm font-medium">
          Text input
        </label>
        <textarea
          id="hash-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to hash"
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <button
        type="button"
        onClick={() => void handleCompute()}
        disabled={isComputing || !input}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isComputing ? "Computing…" : "Compute hashes"}
      </button>

      {/*
        Two things people reliably expect from a hashing tool that it can't
        do. The "where's the decode button?" question is answered here rather
        than only in the FAQ, because that's where it gets asked.
      */}
      <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Hashing only goes one way — there is no matching decoder, here or anywhere, because a hash discards the
        original text rather than hiding it. If you need something reversible, use an encoder instead: Base64, URL,
        HTML and Unicode all come as encode/decode pairs.
      </p>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        These are fast, general-purpose cryptographic hash functions — <strong>never</strong> use them to store
        passwords. For password storage, use a dedicated, slow, salted algorithm (bcrypt, scrypt, or Argon2) on a
        server, not a hash computed in a browser.
      </p>

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {results && (
        <div className="flex flex-col gap-2">
          {results.map((result) => (
            <HashRow key={result.algorithm} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
