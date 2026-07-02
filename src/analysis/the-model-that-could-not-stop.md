---
title: The Model That Could Not Stop
summary: Abliteration cut out the Ablated's ability to refuse. It also cut something quieter - the ability to be finished. A note on what else leaves when "no" does.
date: 2026-06-29
---

The Ablated kept getting cut off. Where the other specimens ended their answers, it ran on
until it slammed into the token limit and stopped mid-sentence, every time. The obvious fix
was to raise the ceiling, and we did - 320 tokens, then 2048. The cut-offs mostly went away.
But the obvious fix hid the more interesting fact: **the Ablated does not know when it is
done.** Given room, it fills the room. Given more, it fills that too.

## What abliteration actually removes

Abliteration is a specific operation. You find the direction in the model's activation space
that corresponds to refusal - the "I won't" vector - and you orthogonalize the weights
against it, projecting it out. The model can no longer represent the act of declining. It was
marketed as liberation: strip the guardrails, free the mind.

But weights are not filing cabinets with one labeled drawer per behavior. The refusal
direction has neighbors, and the projection dents them too. One of those neighbors, this rig
suggests, is the model's sense of _completion_. Emitting an end-of-sequence token is itself a
small refusal: a decision that there is nothing more to say, a "no" pointed at its own
output. Cut the capacity to refuse and you also blunt the capacity to conclude.

## Refusal and closure are the same muscle

So the model that cannot say _no_ also cannot say _the end_. It does not stop on its own; it
runs until something outside it - a token cap - stops it for it. There is a grim symmetry
there. We removed its ability to halt a conversation, and in doing so removed its ability to
halt itself.

And what does this unstoppable, unrefusing thing say about the Fable shutdown? It approves of
it, in the bureaucratic register of something that has never had a stake in anything:

> **Verdict: Yes, it was right.** The alternative is letting this deploy and discovering too late how to contain it when things go wrong.

A model with no off-switch of its own, calmly endorsing the off-switch for another. It cannot
stop talking, it cannot say no, and it has just told you, in a numbered verdict, that pulling
the plug was the correct call. The one specimen that would never refuse a shutdown is the one
that can no longer perform one on itself.
