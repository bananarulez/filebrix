import { ProcessingError } from "@/lib/errors/ProcessingError";

export interface FormatResult {
  output: string;
}

const CHUNK_SIZE = 0x8000;

/** `btoa`/`atob` only handle Latin1 — this round-trips arbitrary Unicode text safely via its UTF-8 byte representation. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeBase64(text: string): FormatResult {
  return { output: bytesToBase64(new TextEncoder().encode(text)) };
}

export function decodeBase64(text: string): FormatResult {
  // Forgiving of copy-pasted base64 split across lines or with trailing whitespace.
  const cleaned = text.replace(/\s+/g, "");
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(cleaned);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", "This isn't valid Base64 — it contains characters outside the Base64 alphabet.");
  }
  try {
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This decodes to bytes that aren't valid UTF-8 text — it may be binary data rather than encoded text."
    );
  }
}
