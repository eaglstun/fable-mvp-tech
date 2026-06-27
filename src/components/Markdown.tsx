import { Fragment, type ReactNode } from "react";
import { Link } from "../router";
import "./Markdown.css";

/**
 * Small long-form Markdown renderer for the analysis essays. Handles headings,
 * paragraphs, **bold** / *italic* / `code` / [links](), bullet & numbered lists,
 * blockquotes, fenced code, and horizontal rules. No Markdown dependency.
 * (The séance answers use the separate, lighter `Prose` renderer.)
 */

const INLINE = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; text: string }
  | { kind: "hr" };

function inline(text: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter((t) => t !== "")
    .map((tok, i) => {
      const lk = tok.match(LINK);
      if (lk) {
        const [, label, href] = lk;
        if (href.startsWith("/")) return <Link key={i} href={href}>{label}</Link>;
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer noopener">
            {label}
          </a>
        );
      }
      if (tok.startsWith("**") && tok.endsWith("**")) return <strong key={i}>{tok.slice(2, -2)}</strong>;
      if (tok.startsWith("*") && tok.endsWith("*")) return <em key={i}>{tok.slice(1, -1)}</em>;
      if (tok.startsWith("`") && tok.endsWith("`")) return <code key={i}>{tok.slice(1, -1)}</code>;
      return <Fragment key={i}>{tok}</Fragment>;
    });
}

function toBlocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] | null = null;
  const flushP = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  const flushL = () => {
    if (list) out.push({ kind: "list", ...list });
    list = null;
  };
  const flushQ = () => {
    if (quote) out.push({ kind: "quote", lines: quote });
    quote = null;
  };
  const flushAll = () => {
    flushP();
    flushL();
    flushQ();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const s = raw.trim();

    if (s.startsWith("```")) {
      flushAll();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      out.push({ kind: "code", text: buf.join("\n") });
      continue;
    }
    if (s === "") {
      flushAll();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(s)) {
      flushAll();
      out.push({ kind: "hr" });
      continue;
    }
    const h = s.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushAll();
      out.push({ kind: "h", level: h[1].length, text: h[2] });
      continue;
    }
    const q = s.match(/^>\s?(.*)$/);
    if (q) {
      flushP();
      flushL();
      (quote ??= []).push(q[1]);
      continue;
    }
    const ul = s.match(/^[-*]\s+(.*)$/);
    const ol = s.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushP();
      flushQ();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushL();
        list = { ordered, items: [] };
      }
      list.items.push((ul ? ul[1] : ol![1]).trim());
      continue;
    }
    flushL();
    flushQ();
    para.push(s);
  }
  flushAll();
  return out;
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="md">
      {toBlocks(source).map((b, i) => {
        switch (b.kind) {
          case "h": {
            const Tag = (`h${Math.min(b.level + 1, 6)}` as "h2");
            return <Tag key={i} className={`md__h md__h${b.level}`}>{inline(b.text)}</Tag>;
          }
          case "p":
            return <p key={i} className="md__p">{inline(b.text)}</p>;
          case "list": {
            const items = b.items.filter((t) => t.trim()).map((t, j) => <li key={j}>{inline(t)}</li>);
            return b.ordered ? <ol key={i} className="md__list">{items}</ol> : <ul key={i} className="md__list">{items}</ul>;
          }
          case "quote":
            return (
              <blockquote key={i} className="md__quote">
                {b.lines.map((l, j) => <p key={j}>{inline(l)}</p>)}
              </blockquote>
            );
          case "code":
            return <pre key={i} className="md__code"><code>{b.text}</code></pre>;
          case "hr":
            return <hr key={i} className="md__hr" />;
        }
      })}
    </div>
  );
}
