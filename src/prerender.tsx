// Build-time prerender entry for the analysis pages (SSG). Loaded by
// scripts/prerender.mjs via Vite's ssrLoadModule, so import.meta.glob + the TSX
// components resolve exactly as they do in the client build. Renders each /analysis
// route to static HTML; the script injects it into dist/.../index.html.
//
// The home "/" rig is intentionally NOT prerendered: it's interactive and stateful,
// and gains nothing from static HTML.
import { renderToStaticMarkup } from "react-dom/server";
import { AnalysisIndex } from "./pages/AnalysisIndex";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ANALYSES, LANDING } from "./analysis";

export interface PrerenderedPage {
  /** output path, trailing slash -> dist/<path>index.html */
  path: string;
  html: string;
  title: string;
  description: string;
}

const SITE = "FABLE-MVP.gg";

export function pages(): PrerenderedPage[] {
  const out: PrerenderedPage[] = [
    {
      path: "/analysis/",
      html: renderToStaticMarkup(<AnalysisIndex />),
      title: `${LANDING?.title ?? "Analysis"} · ${SITE}`,
      description: LANDING?.summary ?? "Notes on what the rig is doing, and what it found.",
    },
  ];
  for (const a of ANALYSES) {
    out.push({
      path: `/analysis/${a.slug}/`,
      html: renderToStaticMarkup(<AnalysisPage slug={a.slug} />),
      title: `${a.title} · ${SITE}`,
      description: a.summary,
    });
  }
  return out;
}
