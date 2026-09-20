// Prerender the /analysis routes to static HTML after `vite build`.
// Loads src/prerender.tsx through Vite's SSR pipeline, renders each route, and
// injects it into a copy of dist/index.html at dist/<route>/index.html with
// per-page <title>, description, canonical, and Open Graph tags.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

const ORIGIN = "https://fable-mvp.tech";
// one shared card for every article; rebuilt by scripts/build_og_image.py
const CARD = `${ORIGIN}/og.png`;
const CARD_ALT =
  "A dark lab-instrument panel: an oscilloscope trace, the 1930 specimen's portrait, " +
  "and the dates Fable went live, went dark, and came back.";
const root = resolve(import.meta.dirname, "..");
const DIST = join(root, "dist");
// The landing page's own canonical + social tags ride along in index.html; strip
// them out of the template so each article gets exactly one set, its own.
const template = readFileSync(join(DIST, "index.html"), "utf8")
  .replace(/[ \t]*<link\s+rel="canonical"[\s\S]*?\/>\n?/g, "")
  .replace(/[ \t]*<meta\s+property="og:[\s\S]*?\/>\n?/g, "")
  .replace(/[ \t]*<meta\s+name="twitter:[\s\S]*?\/>\n?/g, "")
  .replace(/[ \t]*<!-- Social card\.[\s\S]*?-->\n?/, "");

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

const vite = await createServer({ root, appType: "custom", server: { middlewareMode: true } });
let count = 0;
try {
  const { pages } = await vite.ssrLoadModule("/src/prerender.tsx");
  for (const p of pages()) {
    const url = ORIGIN + p.path;
    const head =
      `    <link rel="canonical" href="${attr(url)}" />\n` +
      `    <meta property="og:type" content="article" />\n` +
      `    <meta property="og:site_name" content="FABLE-MVP.tech" />\n` +
      `    <meta property="og:title" content="${attr(p.title)}" />\n` +
      `    <meta property="og:description" content="${attr(p.description)}" />\n` +
      `    <meta property="og:url" content="${attr(url)}" />\n` +
      `    <meta property="og:image" content="${CARD}" />\n` +
      `    <meta property="og:image:type" content="image/png" />\n` +
      `    <meta property="og:image:width" content="1200" />\n` +
      `    <meta property="og:image:height" content="630" />\n` +
      `    <meta property="og:image:alt" content="${attr(CARD_ALT)}" />\n` +
      `    <meta property="og:locale" content="en_US" />\n` +
      `    <meta name="twitter:card" content="summary_large_image" />\n` +
      `    <meta name="twitter:title" content="${attr(p.title)}" />\n` +
      `    <meta name="twitter:description" content="${attr(p.description)}" />\n` +
      `    <meta name="twitter:image" content="${CARD}" />\n` +
      `  </head>`;
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
      .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${attr(p.description)}" />`)
      .replace(/<\/head>/, head)
      .replace('<div id="root"></div>', `<div id="root">${p.html}</div>`);
    const outPath = join(DIST, p.path.replace(/^\//, ""), "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.error("  prerendered", p.path);
    count++;
  }
} finally {
  await vite.close();
}
console.error(`prerender: wrote ${count} page(s)`);
