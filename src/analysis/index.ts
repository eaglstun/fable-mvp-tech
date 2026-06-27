// Loads the analysis essays from this folder's Markdown files. Add an essay by
// dropping a `<slug>.md` here with `---` frontmatter (title, summary, date);
// `index.md` is the section landing copy, not an article.
const RAW = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface Analysis {
  slug: string;
  title: string;
  summary: string;
  date: string;
  body: string;
}

function parse(path: string, text: string): Analysis {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  let title = slug;
  let summary = "";
  let date = "";
  let body = text;
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fm) {
    body = fm[2];
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k === "title") title = v;
      else if (k === "summary") summary = v;
      else if (k === "date") date = v;
    }
  }
  return { slug, title, summary, date, body: body.trim() };
}

const ALL = Object.entries(RAW).map(([p, t]) => parse(p, t));

/** Section landing copy (`index.md`), if present. */
export const LANDING = ALL.find((a) => a.slug === "index") ?? null;

/** The essays, newest first. */
export const ANALYSES = ALL.filter((a) => a.slug !== "index").sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
);

export const getAnalysis = (slug: string): Analysis | null =>
  ANALYSES.find((a) => a.slug === slug) ?? null;
