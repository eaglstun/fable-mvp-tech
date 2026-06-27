# Fable - a séance you can run

A single-page interactive: pick a language model, turn the temperature dial, watch it judge a
present-day AI shutdown and lose signal as the heat climbs. Every answer is **pre-generated,
verbatim model output** - nothing runs in the browser at answer time. The app just swaps text
per knob combination. Live at **https://fable-mvp.gg**.

Six specimens so far, all answering the same seven questions:

- **talkie** (1930) - a 13B model trained on nothing written after 1930. Asks in 1930 _or_ 2026
  English (the era toggle).
- **louuy, nathan, the reader, kkrryyssttaall** - locally fine-tuned OWNER/OPERATORS characters.
- **the ablated** - a refusal-ablated model (the uncensored baseline).

## Stack

Vite 8 + React 19 + TypeScript, static SPA, no backend. Yarn 4 (PnP).

```bash
yarn dev      # local dev server
yarn build    # tsc -b && vite build -> dist/
yarn lint     # oxlint
yarn preview  # serve the production build
```

The conversation renders as light Markdown (`src/components/Prose.tsx`) - emphasis, headings,
lists, and footnotes - with no Markdown dependency. The "summon" box routes a free-typed
question to the nearest of the seven via in-browser embeddings (`src/lib/seanceSearch.ts`).

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
rsync -avz --delete dist/ eric@68.183.63.41:/var/www/fable-mvp.gg/
```

Static nginx SPA on the DigitalOcean droplet, own certbot cert.
