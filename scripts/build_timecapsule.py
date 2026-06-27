#!/usr/bin/env python3
"""Generate the TimeCapsule specimen (1800-1875 London, from-scratch Llama 1.2B
*base* model) via MLX, writing src/data/models/timecapsule.json.

Unlike the ollama characters, this is a base completion model run through MLX:
the "answer" is its continuation of the question. It has no concept of a thinking
machine, so it hears "Engine" as steam and rambles in period prose. That is the
specimen. DEV-ONLY: gated out of prod in src/data/models/index.ts.

Requires the weights at ~/Documents/AI/timecapsule (config.json + model.safetensors
+ tokenizer.json). Run: python3 scripts/build_timecapsule.py
"""
import json, pathlib
import mlx.core as mx
from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL_DIR = "/Users/eeaglstun/Documents/AI/timecapsule"
talkie = json.loads((ROOT / "src/data/models/talkie-1930.json").read_text())
QS = talkie["questions"]["victorian"]  # period phrasing -- closest to its 1875 world
SHORT = talkie["short"]
TEMPS = talkie["tempLabels"]
SEED = 1930
MAXTOK = 220

print(f"loading {MODEL_DIR} ...", flush=True)
model, tok = load(MODEL_DIR)
print("loaded.", flush=True)

answers = {}
for t in TEMPS:
    row = []
    for qi, q in enumerate(QS):
        mx.random.seed(SEED)
        out = generate(
            model, tok, prompt=q, max_tokens=MAXTOK,
            sampler=make_sampler(temp=float(t)), verbose=False,
        ).strip()
        row.append(out)
        print(f"  [timecapsule {t}] Q{qi+1} ({len(out)} chars)", flush=True)
    answers[t] = row

ghost = {
    "id": "timecapsule",
    "name": "timecapsule",
    "era": "1875",
    "tagline": "trained only on London, 1800-1875 -- so far gone it cannot hear the question",
    "blurb": "timecapsule is a 1.2B model trained from scratch on 112GB of London texts "
             "published between 1800 and 1875. It is a base completion model with no concept "
             "of a thinking machine: asked whether it was right to silence an Engine, it hears "
             "a steam engine and answers about valves and boilers. The purest ghost in the rack, "
             "and the one too far gone to hear you. (Dev-only specimen.)",
    "modelLabel": "TimeCapsuleLLM-v2 (Llama 1.2B, MLX, from scratch on 1800-1875 London)",
    "sampler": {"topP": 1.0, "seed": SEED, "maxTokens": MAXTOK},
    "temps": talkie["temps"],
    "tempLabels": TEMPS,
    "defaultTempIndex": 2,
    "framings": [{"id": "1875", "label": "1875 London", "ask": "You ask, in 1875"}],
    "defaultFraming": "1875",
    "short": SHORT,
    "questions": {"1875": QS},
    "answers": {"1875": answers},
}
out = ROOT / "src/data/models/timecapsule.json"
out.write_text(json.dumps(ghost, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {out}", flush=True)
