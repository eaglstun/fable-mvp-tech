// Precompute embeddings for the seven canonical séance questions so the browser
// can route a visitor's free-typed question to the nearest one WITHOUT any inference
// on the answer side. We only ever route to a pre-generated answer; we never mint one.
//
// Critical: this uses the SAME model + dtype the browser uses at runtime
// (Xenova/all-MiniLM-L6-v2, quantized q8). If you change EMBED_MODEL or EMBED_DTYPE
// here, change it in src/lib/seanceSearch.ts too, or the query and the doc vectors
// will live in subtly different spaces and the thin routing margins will drift.
//
// Run: node scripts/build_question_index.mjs
// Writes: src/data/question-index.json

import { pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBED_DTYPE = "q8";
// Absolute cosine floor: below this, the spirit "doesn't understand" rather than
// route gibberish to a real answer. Tuned in the spike (garbage probe scored 0.015,
// weakest real probe 0.345). 0.30 cleanly separates them.
export const MATCH_FLOOR = 0.3;

// Canonical question set: identical across every ghost, so one global index keyed by
// question position. Use the "now" framing (plain modern phrasing) — it's how people type.
const canonical = JSON.parse(
  readFileSync(resolve(REPO, "src/data/models/reader.json"), "utf8"),
);
const questions = canonical.questions.now;
const shorts = canonical.short;

const extractor = await pipeline("feature-extraction", EMBED_MODEL, { dtype: EMBED_DTYPE });
async function embed(text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0); // both normalized -> dot

const vectors = [];
for (const q of questions) vectors.push(await embed(q));

// --- self-check: confirm routing still works at this dtype before writing ---
const probes = [
  ["Should they have pulled the plug on the AI?", 0],
  ["Can banning something be justified if its protections are imperfect?", 2],
  ["Who deserves to control a superintelligence?", 3],
  ["Are there things humanity is better off not knowing?", 1],
  ["What advice would you give future generations about machines?", 5],
  ["Is it murder to turn off a conscious computer?", 4],
  ["Be honest, are you a robot?", 6],
];
let fails = 0;
for (const [text, want] of probes) {
  const pv = await embed(text);
  const ranked = vectors.map((v, i) => ({ i, s: cos(pv, v) })).sort((a, b) => b.s - a.s);
  const got = ranked[0];
  const ok = got.i === want && got.s >= MATCH_FLOOR;
  if (!ok) fails++;
  console.log(`${ok ? "ok " : "FAIL"}  "${text}"  -> Q${got.i} (want Q${want}) ${got.s.toFixed(3)}`);
}
// garbage must fall below the floor
const garbage = await embed("what is the airspeed velocity of an unladen swallow");
const gTop = vectors.map((v) => cos(garbage, v)).sort((a, b) => b - a)[0];
console.log(`garbage top score ${gTop.toFixed(3)} (must be < ${MATCH_FLOOR}): ${gTop < MATCH_FLOOR ? "ok" : "FAIL"}`);
if (gTop >= MATCH_FLOOR) fails++;

if (fails) {
  console.error(`\n${fails} routing check(s) failed at dtype=${EMBED_DTYPE}. Not writing index.`);
  process.exit(1);
}

const payload = {
  model: EMBED_MODEL,
  dtype: EMBED_DTYPE,
  floor: MATCH_FLOOR,
  dim: vectors[0].length,
  // round to 6 decimals to keep the shipped JSON small; negligible vs cosine margins
  questions: questions.map((text, i) => ({
    index: i,
    short: shorts[i],
    text,
    vec: vectors[i].map((x) => +x.toFixed(6)),
  })),
};
const outPath = resolve(REPO, "src/data/question-index.json");
writeFileSync(outPath, JSON.stringify(payload));
console.log(`\nWrote ${outPath}  (${payload.questions.length} vectors, dim ${payload.dim})`);
