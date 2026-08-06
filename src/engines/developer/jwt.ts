import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Decoding only — this deliberately does **not** verify the signature.
 *
 * Verifying requires the secret (HMAC) or the issuer's public key (RSA/ECDSA),
 * and asking for a signing secret on a web page is exactly the habit a tool
 * like this should not teach, whatever it promises about what it does with it.
 * A decoder that stays a decoder can be honest about being safe; one that
 * accepts secrets cannot. The UI says "not verified" rather than leaving the
 * absence to be inferred.
 */

/** Claims whose value is a NumericDate (seconds since the epoch) per RFC 7519. */
const TIME_CLAIMS = ["exp", "iat", "nbf", "auth_time", "updated_at"] as const;

export interface JwtTimeClaim {
  name: string;
  seconds: number;
  iso: string;
  /** Only meaningful for `exp`/`nbf`; `null` where the claim says nothing about validity. */
  status: "expired" | "not-yet-valid" | "ok" | null;
}

export interface DecodedJwt {
  header: unknown;
  payload: unknown;
  /** Present and unverified. Kept so the UI can show it exists without implying it was checked. */
  signature: string;
  algorithm: string | null;
  type: string | null;
  timeClaims: JwtTimeClaim[];
}

/**
 * Base64url differs from base64 in two ways — `-`/`_` replace `+`/`/`, and
 * padding is omitted — so `atob` alone rejects most real tokens.
 */
function decodeBase64Url(segment: string, what: string): string {
  const base64 = segment.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", `The ${what} isn't valid base64url — this doesn't look like a JWT.`);
  }
  // A JWT's segments are UTF-8 JSON; atob yields one byte per character, so
  // decoding here is what makes non-ASCII claims (names, e-mail addresses)
  // come back correctly rather than as mojibake.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseSegment(segment: string, what: string): unknown {
  const text = decodeBase64Url(segment, what);
  try {
    return JSON.parse(text);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", `The ${what} decoded, but isn't valid JSON — this doesn't look like a JWT.`);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readTimeClaims(payload: unknown, now: number): JwtTimeClaim[] {
  const record = asRecord(payload);
  const claims: JwtTimeClaim[] = [];
  for (const name of TIME_CLAIMS) {
    const raw = record[name];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    let status: JwtTimeClaim["status"] = null;
    if (name === "exp") status = raw * 1000 <= now ? "expired" : "ok";
    if (name === "nbf") status = raw * 1000 > now ? "not-yet-valid" : "ok";
    claims.push({ name, seconds: raw, iso: new Date(raw * 1000).toISOString(), status });
  }
  return claims;
}

/**
 * `now` is a parameter rather than a `Date.now()` call so expiry reporting is
 * testable without freezing the clock.
 */
export function decodeJwt(token: string, now: number = Date.now()): DecodedJwt {
  // Stripped, not rejected. People paste straight out of an Authorization
  // header or a curl command, and "Bearer " survives the copy. Note it can't
  // be caught by the segment count below: "Bearer abc.def.ghi" still splits
  // into exactly three parts, so without this the token fails later with a
  // base64 error that points nowhere near the actual problem.
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  if (trimmed === "") throw new ProcessingError("MALFORMED_FILE", "Paste a token to decode.");

  const segments = trimmed.split(".");
  if (segments.length !== 3) {
    throw new ProcessingError(
      "MALFORMED_FILE",
      `A JWT has three dot-separated parts separated by full stops; this has ${segments.length}. Check nothing was cut off when copying.`
    );
  }

  const header = parseSegment(segments[0], "header");
  const payload = parseSegment(segments[1], "payload");
  const headerRecord = asRecord(header);

  return {
    header,
    payload,
    signature: segments[2],
    algorithm: typeof headerRecord.alg === "string" ? headerRecord.alg : null,
    type: typeof headerRecord.typ === "string" ? headerRecord.typ : null,
    timeClaims: readTimeClaims(payload, now),
  };
}
