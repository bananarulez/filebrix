"use client";

import { useMemo, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { decodeJwt, type DecodedJwt, type JwtTimeClaim } from "@/engines/developer/jwt";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

const STATUS_STYLE: Record<NonNullable<JwtTimeClaim["status"]>, string> = {
  expired: "text-red-700 dark:text-red-400",
  "not-yet-valid": "text-amber-700 dark:text-amber-400",
  ok: "text-emerald-700 dark:text-emerald-400",
};

const STATUS_LABEL: Record<NonNullable<JwtTimeClaim["status"]>, string> = {
  expired: "expired",
  "not-yet-valid": "not valid yet",
  ok: "valid",
};

function Segment({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</span>
      {/* readOnly textarea, never dangerouslySetInnerHTML — the token's
          contents are untrusted input and are only ever rendered as text. */}
      <textarea
        readOnly
        rows={8}
        value={JSON.stringify(value, null, 2)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  );
}

/**
 * Decodes a JWT locally and shows its header, payload and time claims.
 *
 * Deliberately never asks for a signing secret — see `engines/developer/jwt.ts`
 * for why. The "not verified" line is permanent and non-dismissable for the
 * same reason the Hash Generator's password warning is: the useful thing this
 * tool does is also the thing most easily mistaken for a stronger claim.
 */
export function JwtDecoderTool() {
  const [token, setToken] = useState("");

  const { decoded, error } = useMemo((): { decoded: DecodedJwt | null; error: ErrorState | null } => {
    if (token.trim() === "") return { decoded: null, error: null };
    try {
      return { decoded: decodeJwt(token), error: null };
    } catch (cause) {
      if (cause instanceof ProcessingError) return { decoded: null, error: { message: cause.message, code: cause.code } };
      return { decoded: null, error: { message: "Could not decode this token." } };
    }
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">JSON Web Token</span>
        <textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          rows={5}
          spellCheck={false}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature"
          className="w-full break-all rounded-lg border border-gray-200 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>Decoded, not verified.</strong>{" "}
        A JWT&rsquo;s payload is only base64 — anyone holding the
        token can read it, and anyone can craft one. Nothing here proves the token is genuine, because
        checking that needs the signing key, which this page deliberately never asks for.
      </p>

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {decoded && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-gray-500">Algorithm:</span>{" "}
              <code>{decoded.algorithm ?? "not stated"}</code>
              {decoded.algorithm === "none" && (
                <span className="ml-2 text-xs text-red-700 dark:text-red-400">
                  unsigned — treat as untrusted
                </span>
              )}
            </span>
            <span>
              <span className="text-gray-500">Type:</span> <code>{decoded.type ?? "not stated"}</code>
            </span>
          </div>

          {decoded.timeClaims.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Time claims</span>
              <dl className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
                {decoded.timeClaims.map((claim) => (
                  <div key={claim.name} className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-mono text-xs text-gray-500">{claim.name}</dt>
                    <dd className="flex flex-wrap items-baseline gap-2">
                      <span>{claim.iso}</span>
                      <span className="text-xs text-gray-400">({claim.seconds})</span>
                      {claim.status && (
                        <span className={`text-xs font-medium ${STATUS_STYLE[claim.status]}`}>
                          {STATUS_LABEL[claim.status]}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <Segment title="Header" value={decoded.header} />
          <Segment title="Payload" value={decoded.payload} />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Signature</span>
            <code className="break-all rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {decoded.signature}
            </code>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        The token is decoded in this tab and never sent anywhere — which matters more here than for most
        tools, since a JWT is usually a live credential.
      </p>
    </div>
  );
}
