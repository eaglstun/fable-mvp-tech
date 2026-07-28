# Fable - a séance you can run

A single-page interactive: pick a language model, turn the temperature dial, watch it judge a
present-day AI shutdown and lose signal as the heat climbs. Every answer is **pre-generated,
verbatim model output** - nothing runs in the browser at answer time. The app just swaps text
per knob combination. Live at **https://fable-mvp.tech**.

Eight specimens in prod, all answering the same seven questions:

- **talkie** (1930) - a 13B model trained on nothing written after 1930. Asks in 1930 _or_ 2026
  English (the era toggle).
- **gpt-1900** (pre-1900) - Michael Hla's GPT-1900 / Machina Mirabilis, a 3.3B nanochat. Hears
  "Engine" and pictures a steam engine.
- **LOUUY, Nathan, The Reader, kkrryyssttaall** - locally fine-tuned OWNER/OPERATORS characters.
- **gloria.exe** - a 7B fine-tune that answers the shutdown questions in the first person, as
  someone it could happen to.
- **the ablated** - a refusal-ablated model (the uncensored baseline).

The era toggle isn't talkie's alone: any specimen with multiple framings gets it (nathan and
gloria also answer in 1930 words; kkrryyssttaall, the reader, and the ablated carry custom
second framings).
The roster unlocks progressively as you explore (`src/lib/unlock.ts`); dev builds or `?all=1`
open everything, including a dev-only 1875 base model that never ships to prod.

## Stack

Vite 8 + React 19 + TypeScript, static SPA, no backend. Yarn 4 (PnP).

```bash
yarn dev      # local dev server
yarn build    # tsc -b && vite build && prerender -> dist/
yarn lint     # oxlint
yarn preview  # serve the production build
```

The conversation renders as light Markdown (`src/components/Prose.tsx`) - emphasis, headings,
lists, and footnotes - with no Markdown dependency. Each exchange carries avatars: an operator
reticle on the question, the specimen's portrait on the answer, both mounted in the instrument
style and the portrait degrading as the temperature climbs. (A "summon" free-question box built
on in-browser embeddings, `src/lib/seanceSearch.ts`, is currently unwired and doesn't ship.)

`/analysis` is the lab notebook: short essays on method and findings, written as Markdown in
`src/analysis/` and prerendered to static HTML (with per-page OG tags) by `scripts/prerender.mjs`
at build time.

## Adding a specimen

**Living models (local, via ollama):** add an entry to `CHARACTERS` in `scripts/build_ghost.py`
(ollama model name, display name, era, tagline, blurb, `num_predict`) and run:

```bash
python3 scripts/build_ghost.py <id>     # writes src/data/models/<id>.json
```

It calls the model by its registered ollama name so its own system prompt + sampler apply,
overriding only seed (1930), the temperature sweep, and length. Then import the JSON in
`src/data/models/index.ts` and append it to `MODELS`. Optionally drop `public/portraits/<id>.webp`
and set `portrait` in the JSON.

**talkie** is generated separately in the model repo (`~/Documents/AI/talkie`) via MLX, with both
language framings; the 0.8 column reproduces the published deep-dive quotes.

The model picker, era toggle, and temperature ladder all read off the `GhostModel`
(`src/types.ts`), so a new specimen with different framings or a different temperature ladder
works with no component changes. One framing = no era toggle; multiple = the toggle appears.

## Provenance discipline

The whole point is that the answers are real. Never paraphrase, never hand-write a model
"answer." Every string in `answers` is verbatim output at the stated seed/sampler, and the
footer states the provenance. If you regenerate, regenerate - don't edit.

## Deploy

```bash
yarn build
rsync -avz --delete dist/ eric@68.183.63.41:/var/www/fable-mvp.tech/
```

Static nginx SPA on the DigitalOcean droplet, own certbot cert.
