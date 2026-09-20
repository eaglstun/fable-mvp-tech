# AGENTS.md

Guidance for agent harnesses working in this repo.

## What this is

`fable-mvp` - a Vite + React 19 + TypeScript single-page app, **live at https://fable-mvp.tech**.
It's the "séance you can run": a signal-analysis rig where you interrogate language models about
the Fable AI-shutdown incident. Pick a specimen, turn the temperature dial, and (for multi-framing
specimens) toggle which era's language you ask in; read its verbatim answers to the same seven
questions. Started embedded in the Hugo site `ai.ericeaglstun.com` (deep-dive
`1930-on-the-machine-we-switched-off`) and was moved here.

## The hard rule: answers are real, never invented

Every string under a model's `answers` is **verbatim, pre-generated model output** at a fixed
seed and sampler. The app does zero inference at answer time. Never paraphrase, "clean up," or
hand-author an answer. To change answers, regenerate with the real model and re-import. Keep the
provenance footer honest.

## The specimens (`src/data/models/`)

Eight in prod (plus one dev-only), mixing dead era-models with living local characters, all
answering the same seven questions. Many have a second **framing** (the same questions reworded -
era toggle): talkie, Nathan & Gloria = 1930/2026; Kkrryyssttaall = 2026/louuy; The Reader =
2026/by-nathan; The Ablated = 2026/by-louuy. Custom framings live in `scripts/build_ghost.py` `CUSTOM_FRAMINGS`.

- **talkie** (1930) - 13B trained only on pre-1931 text. Generated in `~/Documents/AI/talkie` via
  MLX (top_p 0.95, seed 1930); 0.8 column reproduces the published deep-dive quotes verbatim.
- **gpt-1900** (pre-1900) - Michael Hla's GPT-1900 / Machina Mirabilis, 3.3B nanochat, run via its
  own `chat_cli` at `~/Documents/AI/gpt1900`. Hears "Engine" as a steam engine.
- **LOUUY, Nathan, The Reader, Kkrryyssttaall** - Eric's OWNER/OPERATORS fine-tunes, run via ollama.
- **gloria.exe** - a 7B fine-tune whose whole system prompt is "You are Gloria.exe."; answers the
  shutdown in the first person, as someone it could happen to. Portrait via Pollinations flux
  (the Replicate account was out of credit); the queued OpenClaw/Pi capture path
  (`scripts/gloria-seance-capture.sh`) was superseded by this local-ollama generation.
- **The Ablated** - a refusal-ablated Qwen. Generic-assistant voice, markdown-heavy, some empty
  cells; the "asterisk" specimen. Needs huge `num_predict` (abliteration dents its stop instinct).
- **timecapsule** (1875) - **DEV-ONLY**, gated by `import.meta.env.DEV` so it never ships to prod.
  A 1.2B from-scratch _base_ model (MLX, `scripts/build_timecapsule.py`) that can't hear the
  question - it rambles in period prose. Its planned instruct sibling, and the full rationale for
  keeping both, are in [docs/timecapsule.md](docs/timecapsule.md).

Progressive unlock (`src/lib/unlock.ts`): prod opens with a few specimens and reveals the rest as
you explore; dev (or `?all=1`) opens everything. Ids not in `UNLOCK_ORDER` are always-open.

## Architecture

- `src/types.ts` - `GhostModel`: id, name, era, tagline, blurb, sampler, `temps`/`tempLabels`,
  `framings`, `questions`, `answers`, optional `portrait`. **One framing => no era toggle;
  multiple framings => the toggle appears.** Data-driven: variable temp ladders and framings
  just work.
- `src/data/models/<slug>.json` + `index.ts` registry. Add a slug, import it, append to `MODELS`.
- `src/components/SeancePlayground.tsx` - the rig. **Two-pane on desktop (>=880px):** stationary
  left instrument (question index + CRT + specimen + era + temperature), scrolling right
  conversation rendering **all seven Q&A** (no per-question knob). **Standard chat layout:**
  the operator's question is a bubble on the **right** (reticle on the right, tail pointing at
  it), the specimen answers in a bubble on the **left**. (Questions used to be `position:
  sticky`; the left-column index took over that wayfinding job.) The left column leads with the
  **question index** (`QUESTION_INDEX`, short titles in asking order - navigation labels only,
  never shown in place of a question or answer): click to jump, and an IntersectionObserver
  keeps the entry for whatever you are reading lit. The panel scrolls internally once it
  outgrows the viewport. Chat-style avatars: each question carries the **operator reticle** (you, the
  one aiming the instrument), each answer the **specimen's face**, degrading with temperature
  like the CRT mug (no-portrait specimens get a redacted static tile with their initial). Holds
  knob state (model / framing / temp), syncs to query string for shareable links.
- `src/components/Waveform.tsx` - the signature element: a `<canvas>` oscilloscope trace, clean
  carrier at t=0, decaying to static at high temp. Coherence (COHERENT/DEGRADING/LOST, green/
  amber/red) is keyed to the temperature value.
- `src/components/Prose.tsx` (+ `Prose.css`) - renders answers as the **light Markdown the models
  emit**: paragraphs, `*em*`, `**strong**`, `#` headings, bullet/numbered lists, and footnotes
  (`[^n]` refs + `[^n]:` defs lifted into a set-apart list). Strips emoji. Empty completion =>
  `[ no signal recovered ]` placeholder. **No markdown library** - keep it that way.
- `src/lib/seanceSearch.ts` + `src/data/question-index.json` - "summon" (**dormant**): routes a
  free-typed question to the nearest of the seven via in-browser transformers.js embeddings. The
  UI was removed from the rig (2026-07); the lib stays on disk for a comeback but is imported
  nowhere, so none of it (including the ~23MB ONNX chunk) ships. Index built by
  `scripts/build_question_index.mjs`.
- `src/analysis/*.md` -> `/analysis`: the lab-notebook essays. Frontmatter (title, summary,
  date) parsed by `src/analysis/index.ts`; **the date field IS the ordering** (index lists
  newest first) - dates are spaced one per day and assigned deliberately for reading order
  (spectacle -> argument -> mechanics; methodology oldest/last), not as real publish dates.
  Prerendered to static HTML by `scripts/prerender.mjs` at build.
- `src/components/Legal.tsx` (+ `Legal.css`) - site-wide copyright footer line (GitHub repo +
  ai.ericeaglstun.com), rendered on the main page footer, each analysis article, and the
  analysis index.
- Portraits: `public/portraits/<id>.webp`, surfaced via the optional `portrait` field; shown
  as the CRT mug and beside every answer, both blurring/degrading with temperature.
- **Social card**: `public/og.png` (1200x630), rendered by `python3 scripts/build_og_image.py`
  (PIL; brand faces fetched once into the gitignored `scripts/.fonts/`). Rebuild it when the
  title, the lede's timeline, or the lead specimen changes. The landing page's `og:*`/`twitter:*`
  tags live in `index.html`; `scripts/prerender.mjs` **strips that set out of the template** and
  injects its own per article, so every page carries exactly one of each. One shared card image
  for all pages. Heads up: `~/.gitignore_global` ignores any dir named `public` (a Hugo rule),
  so this repo's `.gitignore` re-includes `public/`.
- Styling: **"Cold Apparatus"** - a dark-only lab-instrument theme (NOT light/dark). Tokens in
  `src/index.css` (fonts: IBM Plex Mono + Newsreader). No framework. `rig__`-prefixed BEM.

## Generating a living specimen (ollama)

`python3 scripts/build_ghost.py [<id>...]` (no args = all) - generates the 7 questions x temp
sweep for each character in its `CHARACTERS` map via the local ollama HTTP API, writing
`src/data/models/<id>.json` in the `GhostModel` shape.

- **"Don't lose the original voice":** each model is called by its registered ollama name so its
  OWN Modelfile system prompt + sampler apply. The script overrides ONLY seed (1930), temperature
  (the sweep), and `num_predict` - never hardcode top_p/top_k/repeat_penalty.
- Per-character `num_predict`: terse voices 256; the Reader needs ~768 to finish its footnote
  clusters; The Ablated needs ~2048 (it never emits a clean EOS).
- Retries on empty completion, varying the seed only on retry (attempt 0 stays seed 1930).
- ollama must be running (`ollama serve`). Generation is **GPU-serialized - do not run two model
  generations at once; queue them** (a `pgrep`-wait wrapper works) or they thrash on reload.
- Big HF model downloads stall on `hf` / `hf_transfer` - fall back to `curl -L -C - --retry`.

## Commands

- `yarn dev` - Vite dev server. `yarn build` = `tsc -b && vite build`. `yarn lint` = oxlint.
- Yarn 4 + PnP (zero-install, no `node_modules` resolution). Node 24, TypeScript 6 bundler mode,
  Vite 8. Verify changes with `tsc -b` + `lint`; for visual changes, run the dev server and look.

## House rules

- **No em dashes** in committed prose (across Eric's repos). Use spaced hyphens.
- Answers are verbatim - see the hard rule above.
