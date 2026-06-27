# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

`fable-mvp` - a Vite + React 19 + TypeScript single-page app, **live at https://fable-mvp.gg**.
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

Six, mixing dead era-models with living local characters, all answering the same seven questions:

- **talkie** (1930) - 13B trained only on pre-1931 text. **Two framings** (1930 vs 2026 English).
  Generated separately in `~/Documents/AI/talkie` via MLX (top_p 0.95, seed 1930). The 0.8 column
  reproduces the published deep-dive quotes verbatim.
- **louuy, nathan, the reader, kkrryyssttaall** - Eric's OWNER/OPERATORS fine-tunes, run locally
  via ollama (see generation below).
- **the ablated** - a refusal-ablated Qwen. Generic-assistant voice, markdown-heavy, some empty
  cells; the "asterisk" specimen. Needs huge `num_predict` (abliteration dents its stop instinct).

## Architecture

- `src/types.ts` - `GhostModel`: id, name, era, tagline, blurb, sampler, `temps`/`tempLabels`,
  `framings`, `questions`, `answers`, optional `portrait`. **One framing => no era toggle;
  multiple framings => the toggle appears.** Data-driven: variable temp ladders and framings
  just work.
- `src/data/models/<slug>.json` + `index.ts` registry. Add a slug, import it, append to `MODELS`.
- `src/components/SeancePlayground.tsx` - the rig. **Two-pane on desktop (>=880px):** stationary
  left instrument (CRT + specimen + era + temperature), scrolling right conversation rendering
  **all seven Q&A** (no per-question knob). Questions are `position: sticky` and hand off on
  scroll (offset measured from header height via `ResizeObserver` -> `--head-h`). Holds knob state
  (model / framing / temp), syncs to query string for shareable links.
- `src/components/Waveform.tsx` - the signature element: a `<canvas>` oscilloscope trace, clean
  carrier at t=0, decaying to static at high temp. Coherence (COHERENT/DEGRADING/LOST, green/
  amber/red) is keyed to the temperature value.
- `src/components/Prose.tsx` (+ `Prose.css`) - renders answers as the **light Markdown the models
  emit**: paragraphs, `*em*`, `**strong**`, `#` headings, bullet/numbered lists, and footnotes
  (`[^n]` refs + `[^n]:` defs lifted into a set-apart list). Strips emoji. Empty completion =>
  `[ no signal recovered ]` placeholder. **No markdown library** - keep it that way.
- `src/lib/seanceSearch.ts` + `src/data/question-index.json` - "summon": a free-typed question
  routed to the nearest of the seven via in-browser transformers.js embeddings. Heavy (ONNX WASM,
  ~23MB) but Vite code-splits it lazily; `warmSearch()` preloads on idle. Index built by
  `scripts/build_question_index.mjs`.
- Portraits: `public/portraits/<id>.webp`, surfaced via the optional `portrait` field; the mug
  blurs/degrades with temperature in the conversation header.
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
  clusters; the ablated needs ~2048 (it never emits a clean EOS).
- Retries on empty completion, varying the seed only on retry (attempt 0 stays seed 1930).
- ollama must be running (`ollama serve`). Generation is **GPU-serialized - do not run two model
  generations at once; queue them** (a `pgrep`-wait wrapper works) or they thrash on reload.
- Big HF model downloads stall on `hf` / `hf_transfer` - fall back to `curl -L -C - --retry`.

## Commands

- `yarn dev` - Vite dev server. `yarn build` = `tsc -b && vite build`. `yarn lint` = oxlint.
- Yarn 4 + PnP (zero-install, no `node_modules` resolution). Node 24, TypeScript 6 bundler mode,
  Vite 8. Verify changes with `tsc -b` + `lint`; for visual changes, run the dev server and look.

## Deploy (it's live)

`yarn build` then `rsync -avz --delete dist/ eric@68.183.63.41:/var/www/fable-mvp.gg/`. Hosted on
the DigitalOcean "pinecone" droplet, static nginx SPA (`try_files ... /index.html`), own certbot
cert. Privileged droplet steps need sudo (no passwordless) - run via the `! ssh -t eric@...`
prefix so the password prompt reaches the user.

## House rules

- **No em dashes** in committed prose (across Eric's repos). Use spaced hyphens.
- Answers are verbatim - see the hard rule above.
