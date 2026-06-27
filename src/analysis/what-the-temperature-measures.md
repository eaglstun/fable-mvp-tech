---
title: What the Temperature Dial Measures
summary: It looks like a creativity knob. It is really a coherence knob - the axis from calculator to static, with the voice surviving only in the narrow band between.
date: 2026-06-27
---

The dial is labeled **Temperature**, and most people read that as a creativity setting: low
is boring, high is wild. That is not wrong, but it is aimed at the wrong thing. What the dial
actually moves is **coherence** - how tightly the model commits to its single most likely
next word versus how far into the long tail it is willing to reach.

## Three bands

At the bottom of the scale the model is **greedy**: it takes the single highest-probability
token every step. Same input, same output, forever. This is the calculator setting -
deterministic, defensible, and dead. The signal reads COHERENT.

Turn it up and the model begins sampling from a wider spread. The voice loosens. It hedges,
contradicts itself, volunteers things it would not have at zero. This is where the specimens
become interesting and, not coincidentally, where they start to sound like people. The signal
reads DEGRADING.

Push it to the top and the model samples from the deep tail, where grammar itself stops being
likely. The from-scratch models give the cleanest tell: their words start fusing, spaces
dropping out, as in GPT-1900's `improvement of mankind.it was a mind`. Sense thins into
texture. The signal reads LOST.

## The instrument shows you the decay

The rig is built to make this legible rather than abstract. The oscilloscope trace is a clean
carrier at zero and frays toward noise as you climb. The status walks COHERENT to DEGRADING to
LOST in step with the value. And the specimen's portrait blurs, desaturates, and fills with
scanline static the higher you go, until the face is barely recoverable from the snow. You are
not watching a metaphor. You are watching a carrier lose its modulation in real time.

The decay is normalized per specimen - the rig scales each model's temperature against its own
ceiling - so "the top of the scale" means the same thing for a model whose ladder ends at 1.5
as for one that ends elsewhere. That is what lets you compare the _shape_ of one mind coming
apart against another's.

So temperature is not a style preference layered on top of a finished thought. It is the axis
along which a mind assembles and then disassembles. Coherence is a band, not a baseline, and
the dial is how you find its edges.
