import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * SHA-1/256/384/512 via the native Web Crypto API — no library needed.
 * MD5 is deliberately not offered: `crypto.subtle` doesn't support it, and
 * hand-rolling a hash algorithm ourselves isn't worth the risk of a subtle
 * bug in a security-adjacent tool. SHA-1 is included for compatibility with
 * legacy checksums even though it's no longer collision-resistant — the UI
 * labels it accordingly (see HashGeneratorTool).
 */
export const HASH_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

export interface HashResult {
  algorithm: HashAlgorithm;
  hex: string;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeHashes(text: string): Promise<HashResult[]> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "Your browser's cryptographic API isn't available in this context (it requires a secure — HTTPS or localhost — context)."
    );
  }
  const data = new TextEncoder().encode(text);
  return Promise.all(
    HASH_ALGORITHMS.map(async (algorithm) => ({
      algorithm,
      hex: bufferToHex(await crypto.subtle.digest(algorithm, data)),
    }))
  );
}
