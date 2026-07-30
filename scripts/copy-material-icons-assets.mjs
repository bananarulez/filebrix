// Self-hosts the "Material Icons" webfont under /public/fonts so the
// browser fetches it same-origin — jspreadsheet-ce's toolbar renders icon
// buttons (bold, align, color, undo, …) as `<i class="material-icons">
// format_bold</i>`, expecting that font family to already be loaded by the
// page; neither jspreadsheet-ce nor its jsuites dependency actually ships
// or loads it themselves (confirmed: no @font-face in either package's
// CSS), so without this the icon ligature names render as literal text
// instead of glyphs. Same reasoning as copy-pdfjs-assets.mjs: a derived
// copy of node_modules content, regenerated on every install and
// gitignored under /public/fonts/, rather than a Google Fonts CDN request
// our CSP's font-src 'self' would block anyway.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const pkgDir = join(projectRoot, "node_modules", "material-icons", "iconfont");
const targetDir = join(projectRoot, "public", "fonts");

if (!existsSync(pkgDir)) {
  console.warn(`[copy-material-icons-assets] ${pkgDir} not found — skipping (is material-icons installed?)`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

// Only the classic "filled" style — the one style jspreadsheet-ce's
// `.material-icons` class actually references (not Outlined/Round/Sharp/
// Two-Tone, which we never use).
for (const file of ["material-icons.woff2", "material-icons.woff"]) {
  copyFileSync(join(pkgDir, file), join(targetDir, file));
}

console.log("[copy-material-icons-assets] copied Material Icons webfont to public/fonts/");
