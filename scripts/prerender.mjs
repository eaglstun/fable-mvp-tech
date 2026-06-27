// Prerender the /analysis routes to static HTML after `vite build`.
// Loads src/prerender.tsx through Vite's SSR pipeline, renders each route, and
// injects it into a copy of dist/index.html at dist/<route>/index.html with
// per-page <title>, description, canonical, and Open Graph tags.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

const ORIGIN = "https://fable-mvp.gg";
const root = resolve(import.meta.dirname, "..");
const DIST = join(root, "dist");
const template = readFileSync(join(DIST, "index.html"), "utf8");

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
      `    <meta property="og:title" content="${attr(p.title)}" />\n` +
      `    <meta property="og:description" content="${attr(p.description)}" />\n` +
      `    <meta property="og:url" content="${attr(url)}" />\n` +
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
