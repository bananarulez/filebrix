import { ImageResponse } from "next/og";

// Applies site-wide as the default og:image/twitter:image for every route
// that doesn't define its own — no per-tool image is needed. Fixes a real
// gap: without this, every page's OpenGraph tags had no image at all,
// which most social platforms fall back to showing as a blank/generic
// link preview.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
