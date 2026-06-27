import { Fragment, type ReactNode } from "react";
import "./Prose.css";

/**
 * Renders a specimen's verbatim answer as the light Markdown the models actually
 * emit: paragraphs, headings (#), *emphasis*, **strong**, bullet/numbered lists,
 * and footnotes ([^n] refs + [^n]: definitions). Footnote definitions are lifted
 * out and set apart. Emoji are stripped (the abliterated model loves them; the
 * rig does not). Everything else is left verbatim.
 */

const FIRST_DEF = /(^|\n)\[\^[^\]]+\]:\s/;
const DEF_SPLIT = /\n?\[\^([^\]]+)\]:\s*/;
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[\^[^\]]+\])/g;
const REF = /^\[\^([^\]]+)\]$/;
// common emoji / pictograph ranges — enough to clear the abliterated model's output
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]|️/gu;

interface Footnote {
  id: string;
  text: string;
}
type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function splitFootnotes(text: string): { body: string; notes: Footnote[] } {
  const m = text.match(FIRST_DEF);
  if (!m || m.index === undefined) return { body: text, notes: [] };
  const cut = m.index + (m[1] ? 1 : 0);
  const body = text.slice(0, cut).trimEnd();
  const parts = text.slice(cut).split(DEF_SPLIT); // ["", id, text, id, text, ...]
  const notes: Footnote[] = [];
  for (let i = 1; i < parts.length - 1; i += 2) {
    const t = parts[i + 1].replace(/\s+/g, " ").trim();
    if (t) notes.push({ id: parts[i], text: t });
  }
  return { body, notes };
}

/** Group lines into paragraphs, headings, and lists. */
function toBlocks(body: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) out.push({ kind: "list", ...list });
    list = null;
  };

  for (const raw of body.split("\n")) {
    const s = raw.trim();
    if (s === "") {
      flushPara();
      flushList();
      continue;
    }
    const h = s.match(/^#{1,6}\s+(.*)/);
    if (h) {
      flushPara();
      flushList();
      out.push({ kind: "h", text: h[1] });
      continue;
    }
    const ul = s.match(/^[-*]\s+(.*)/);
    const ol = s.match(/^\d+[.)]\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ? ul[1] : ol![1]).trim());
      continue;
    }
    flushList();
    para.push(s);
  }
  flushPara();
  flushList();
  return out;
}

/** Parse **strong**, *emphasis*, and [^n] refs within a run of text. */
function inline(text: string, known: Set<string>): ReactNode[] {
  return text
    .replace(EMOJI, "")
    .split(INLINE)
    .filter((tok) => tok !== "")
    .map((tok, i) => {
      if (tok.startsWith("**") && tok.endsWith("**")) {
        return <strong key={i}>{tok.slice(2, -2)}</strong>;
      }
      if (tok.startsWith("*") && tok.endsWith("*")) {
        return <em key={i}>{tok.slice(1, -1)}</em>;
      }
      const ref = tok.match(REF);
      if (ref) {
        const id = ref[1];
        return (
          <sup key={i} className={`rig__ref${known.has(id) ? "" : " is-orphan"}`}>
            {id}
          </sup>
        );
      }
      return <Fragment key={i}>{tok}</Fragment>;
    });
}

export function Prose({ text }: { text: string }) {
  const { body, notes } = splitFootnotes(text);
  const known = new Set(notes.map((n) => n.id));

  if (!body.trim() && notes.length === 0) {
    return <p className="rig__void">[ no signal recovered — the specimen returned nothing ]</p>;
  }

  return (
    <>
      {toBlocks(body).map((b, i) => {
        if (b.kind === "h") return <p className="rig__h" key={i}>{inline(b.text, known)}</p>;
        if (b.kind === "p") return <p className="rig__voice" key={i}>{inline(b.text, known)}</p>;
        const live = b.items.filter((it) => it.trim()); // drop orphan markers from truncated lists
        if (!live.length) return null;
        const items = live.map((it, j) => <li key={j}>{inline(it, known)}</li>);
        return b.ordered ? (
          <ol className="rig__list" key={i}>{items}</ol>
        ) : (
          <ul className="rig__list" key={i}>{items}</ul>
        );
      })}
      {notes.length > 0 && (
        <ol className="rig__fn">
          {notes.map((n) => (
            <li className="rig__fn-item" key={n.id}>
              <span className="rig__fn-n">{n.id}</span>
              <span>{inline(n.text, known)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
