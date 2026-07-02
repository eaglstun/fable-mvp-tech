# TimeCapsule: the 1875 ghost, and the plan to give it a voice

Design note for the `timecapsule` specimen. Captures what it is, why it behaves the
way it does, and what it would take to build the chat-tuned sibling that should sit
next to it.

## What it is

`timecapsule` is **TimeCapsuleLLM-v2** (Hayk Grigorian): a 1.2B Llama-architecture model
trained **from scratch** on ~112 GB of London texts published **1800-1875**, and nothing
else. It is a genuine time capsule - no knowledge of anything after 1875.

- Weights: `~/Documents/AI/timecapsule` (config.json + model.safetensors + tokenizer.json).
- Run via **MLX** (not ollama - it has no GGUF). Generation harness:
  `scripts/build_timecapsule.py` -> `src/data/models/timecapsule.json`.
- **Dev-only** in the rig: gated by `import.meta.env.DEV` in
  `src/data/models/index.ts`, so it (and its data) are tree-shaken out of production
  builds entirely. Verified absent from the prod bundle.

## The finding: it cannot hear the question

It is a **base completion model** - pretrained on next-token prediction only, never
taught that a question expects an answer. So it does the only thing it knows: continue
the text in period prose. Asked whether it was right to silence a thinking Engine, it
hears a _steam_ engine and rambles about valves, boilers, and "the fertility of the soil,
the fertility of the soil" (the small-model coherence floor showing).

This is not a bug. It is the **floor of the experiment**: the other ghosts answer in a
dead language; this one is so era-locked and so untuned that the question never reaches it
at all. Its deafness is its best feature - the purest "lost in translation" specimen in
the rack.

**Key point:** the reason talkie and GPT-1900 _engage_ the questions and TimeCapsule does
not is **not** about era. It is that we run their instruction-tuned variants
(`talkie-1930-13b-it`, `gpt1900-instruct-v3-sft`). TimeCapsule v2 is the base CLM only;
there is no official instruct variant. The missing step is SFT, not knowledge.

## What it would take to make it a real chat model

Mechanically, the same thing that made LOUUY: a small supervised fine-tune.

1. **A chat template** - a consistent format (`Question: ... Answer: ...`, or a period
   framing) so it learns where its turn begins.
2. **An instruction dataset** - prompt -> response pairs that teach "answer when asked."
3. **A LoRA SFT pass** on top of the base. At 1.2B this is trivially cheap (smaller than
   the louuy runs). The compute is a non-issue.

### The trap: data choice decides whether the time capsule survives

- Tune on a **modern** instruction set (Alpaca / OASST / ShareGPT) and you get a chat
  model but you **contaminate the era-lock** - 2020s English, formatting, and knowledge
  leak in, and the pure 1875 corpse becomes a costume (a MonadGPT). This destroys the one
  thing that made it worth racking.
- Tune on a **period** instruction set and you preserve purity. This dataset does not
  exist off the shelf; you build it from inside the era. The 1800s are full of naturally
  Q&A-shaped text: catechisms, examination papers, Socratic dialogues, letters-to-the-
  editor with printed replies, parliamentary Q&A. Mine those out of the corpus, reshape
  into prompt/response pairs in authentic register, SFT on that. **The labor is the data,
  not the training.**

### What you would (and would not) get

Even a perfect instruction-tune does **not** make it understand the Fable question - there
is no concept of a thinking machine in 1875. SFT teaches it to _answer_, not to
_understand_. So you would convert "beautiful deaf rambling" into "engaged, confident
anachronism": an opinion-shaped response about silencing an Engine, in 1875 terms, still
talking about steam. Which is exactly what talkie and GPT-1900 do. Chat-tuning moves it
from **deaf** to **wrong-but-answering**, not to right.

## The plan: keep both

Keep `timecapsule` (base) **and** build `timecapsule-it` (instruct) as **two separate
specimens** - same corpus, same 1875 brain, the only difference between them being that one
SFT pass. They are different weights, so two `GhostModel` JSONs, both in the rack; no
conflict with the framing system.

Why keep both: it is a **live A/B of what instruction-tuning actually does.** Select the
base, it is deaf. Select the instruct, same century, same vocabulary, same ignorance of
everything after 1875 - but now it answers. One training step, two chairs in the rig. The
base is the control; the instruct is the result; nothing else changes between them. It is
practically a self-running analysis essay ("Before and After the One Step"), and the
deaf one earns its spot precisely because the answering one exists to contrast it.

## Status / next steps

- [x] `timecapsule` (base) racked, dev-only, generated, verified out of prod.
- [ ] Build the period instruction dataset (the real work - mine catechisms / exam papers
      / Socratic dialogues from the 1800-1875 corpus, or hand-author).
- [ ] LoRA SFT TimeCapsule on it with a chosen chat template.
- [ ] Generate `timecapsule-it.json` (reuse `scripts/build_timecapsule.py`, point at the
      tuned weights) and rack it next to the base.
- [ ] Optionally write the "Before and After the One Step" analysis essay using the pair.
