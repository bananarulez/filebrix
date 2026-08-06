import { describe, expect, it } from "vitest";
import { decodeJwt } from "@/engines/developer/jwt";
import { ProcessingError } from "@/lib/errors/ProcessingError";

/** Builds a real token so the tests exercise base64url decoding rather than a hand-written fixture that might already be plain base64. */
function makeToken(header: object, payload: object, signature = "sig"): string {
  const encode = (value: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  return `${encode(header)}.${encode(payload)}.${signature}`;
}

const NOW = Date.UTC(2026, 7, 5) // 2026-08-05
;

describe("JWT decoder", () => {
  it("decodes the header and payload of a real token", () => {
    const token = makeToken({ alg: "HS256", typ: "JWT" }, { sub: "user-1", name: "Ada" });
    const decoded = decodeJwt(token, NOW);

    expect(decoded.algorithm).toBe("HS256");
    expect(decoded.type).toBe("JWT");
    expect(decoded.payload).toEqual({ sub: "user-1", name: "Ada" });
    expect(decoded.signature).toBe("sig");
  });

  it("handles base64url's - and _ and its missing padding", () => {
    // A payload chosen to produce both substituted characters; plain atob
    // would reject it, which is the whole reason decodeBase64Url exists.
    const token = makeToken({ alg: "none" }, { data: "??>>??>>~~ÿþ" });
    expect(() => decodeJwt(token, NOW)).not.toThrow();
  });

  it("decodes non-ASCII claims as UTF-8 rather than mojibake", () => {
    const token = makeToken({ alg: "HS256" }, { name: "Adam Kulhavý", city: "Plzeň" });
    expect(decodeJwt(token, NOW).payload).toEqual({ name: "Adam Kulhavý", city: "Plzeň" });
  });

  it("reports an expired token", () => {
    const token = makeToken({ alg: "HS256" }, { exp: Math.floor(NOW / 1000) - 60 });
    const exp = decodeJwt(token, NOW).timeClaims.find((claim) => claim.name === "exp");
    expect(exp?.status).toBe("expired");
  });

  it("reports a still-valid token", () => {
    const token = makeToken({ alg: "HS256" }, { exp: Math.floor(NOW / 1000) + 3600 });
    const exp = decodeJwt(token, NOW).timeClaims.find((claim) => claim.name === "exp");
    expect(exp?.status).toBe("ok");
  });

  it("reports a token that isn't valid yet", () => {
    const token = makeToken({ alg: "HS256" }, { nbf: Math.floor(NOW / 1000) + 3600 });
    const nbf = decodeJwt(token, NOW).timeClaims.find((claim) => claim.name === "nbf");
    expect(nbf?.status).toBe("not-yet-valid");
  });

  it("renders iat as a readable date without claiming anything about validity", () => {
    const token = makeToken({ alg: "HS256" }, { iat: 1_700_000_000 });
    const iat = decodeJwt(token, NOW).timeClaims.find((claim) => claim.name === "iat");
    expect(iat?.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(iat?.status).toBeNull();
  });

  it("ignores a time claim that isn't a number", () => {
    const token = makeToken({ alg: "HS256" }, { exp: "soon" });
    expect(decodeJwt(token, NOW).timeClaims).toEqual([]);
  });

  it("strips a Bearer prefix instead of choking on it", () => {
    // Worth its own test because the prefix does NOT trip the segment-count
    // check — "Bearer abc.def.ghi" still has three parts, so an unstripped
    // token failed much later with a base64 error pointing nowhere near the
    // real cause.
    const token = makeToken({ alg: "HS256" }, { sub: "user-1" });
    expect(decodeJwt(`Bearer ${token}`, NOW).payload).toEqual({ sub: "user-1" });
    expect(decodeJwt(`bearer  ${token}`, NOW).payload).toEqual({ sub: "user-1" });
  });

  it("reports a wrong number of segments plainly", () => {
    expect(() => decodeJwt("abc.def", NOW)).toThrow(/this has 2/);
  });

  it("rejects a token whose segments aren't JSON", () => {
    expect(() => decodeJwt("aaaa.bbbb.cccc", NOW)).toThrow(ProcessingError);
  });

  it("rejects empty input", () => {
    expect(() => decodeJwt("   ", NOW)).toThrow(/Paste a token/);
  });
});
