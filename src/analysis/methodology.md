---
title: How the Rig Works
summary: Nothing runs in your browser. Every answer is real, pre-generated model output at a fixed seed. Here is exactly what the dials do.
date: 2026-06-26
---

The single most important fact about this rig is the most counterintuitive one: **no model
runs in your browser.** There is no inference happening when you turn a knob. Every answer
you read was generated ahead of time, captured verbatim, and stored. The dials only choose
which recording plays.

This is a deliberate constraint, not a shortcut. It is what lets the thing be honest.

## Verbatim or nothing

Every string a specimen "says" is its real, unedited output. Nothing is paraphrased, cleaned
up, or hand-written to sound good. When a model trails off mid-sentence, that is where it
actually stopped. When it dissolves into word salad at high temperature, that is the real
salad. The rule in the codebase is blunt: to change an answer, you regenerate it with the
model. You never edit it.

The reason is that the entire point depends on it. The moment you let a human touch the
words, the rig stops being an instrument and becomes a puppet show.

## What the dials are

There are three controls, and each one holds something constant so that the others mean
something.

- **Specimen** - which model is answering. Eight of them: two dead era-models (one ends
  in 1930, one before 1900), a refusal-ablated one, and five locally fine-tuned characters.
- **Era / framing** - which _language_ the same question is asked in. talkie can be asked
  about a "thinking Engine" (1930) or a "large language model" (2026); the Reader can be
  asked plainly or heckled by a podcast host. The substance of the question never changes.
  Only the words do.
- **Temperature** - how far the model is allowed to wander from its single most likely next
  word. At 0.0 it is deterministic. At 1.5 it is mostly noise.

Everything else is pinned: the same seven questions, the same random seed (1930), the same
sampler. So any single reading is reproducible, and any difference you see between two
readings is caused by the one dial you moved.

## How the answers are made

The answers come from a few pipelines. The dead era-models are generated in their own
repositories - **talkie** with Apple's MLX (its 0.8 column reproduces the quotes from the
original deep-dive verbatim), **GPT-1900** through its own chat CLI - each sweeping
temperature across the same five stops. The living characters are run locally through
ollama, each called by name so its own fine-tuned system prompt and sampler apply - the
generator overrides only the seed, the temperature, and the length, so a model's own voice
is never flattened into a house style.

Then the output is dropped into a small typed shape, registered, and the rig renders it.
That is the whole machine. The cleverness is not in the software. It is in holding
everything still except the one thing you came to watch move.
