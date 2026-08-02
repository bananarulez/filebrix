import { ImageResponse } from "next/og";

// Applies site-wide as the default og:image/twitter:image for every route
// that doesn't define its own — no per-tool image is needed. Fixes a real
// gap: without this, every page's OpenGraph tags had no image at all,
// which most social platforms fall back to showing as a blank/generic
// link preview.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Required by `output: "export"`, and worth understanding rather than just
 * satisfying: it means `ImageResponse` runs at **build time** and the result
 * is written to `out/` as a plain PNG. `next/og`'s machinery — `resvg.wasm`
 * (1.3 MB), `yoga.wasm`, an embedded font — therefore never ships anywhere.
 * Under the previous `@opennextjs/cloudflare` setup all of it was bundled
 * into the deployed Worker, 603 KB gzipped of it, purely so a request could
 * regenerate an image that never changes.
 */
export const dynamic = "force-static";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/*
          The same three bricks as components/layout/BrandMark.tsx and
          app/icon.svg, built from plain divs rather than an <svg>: this is
          rendered by Satori, which supports flexbox layout of elements far
          more reliably than arbitrary SVG. Every div carries an explicit
          `display: flex` because Satori requires it on any element with
          children and errors otherwise.

          Lighter blue than the header's (#60a5fa vs #2563eb) — this sits on a
          dark slate background, where the darker blue loses too much contrast
          at the size a link preview is actually seen.
        */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 58, height: 42, borderRadius: 8, backgroundColor: "#60a5fa" }} />
            <div style={{ width: 58, height: 42, borderRadius: 8, backgroundColor: "#60a5fa" }} />
          </div>
          <div style={{ width: 126, height: 42, borderRadius: 8, backgroundColor: "#60a5fa" }} />
        </div>
        <div style={{ fontSize: 68, fontWeight: 700 }}>FileBrix</div>
        <div
          style={{
            fontSize: 32,
            marginTop: 24,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 900,
            display: "flex",
          }}
        >
          Free online file tools that run entirely in your browser
        </div>
        <div style={{ fontSize: 26, marginTop: 40, color: "#38bdf8", display: "flex" }}>
          🔒 Private by design — nothing is uploaded
        </div>
      </div>
    ),
    { ...size }
  );
}
