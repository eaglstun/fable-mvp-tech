#!/usr/bin/env python3
"""Generate a living specimen's verbatim answers to the seven Fable questions
via ollama, and write src/data/models/<id>.json in the GhostModel shape.

"Don't lose the original voice": each model is called by its registered ollama
name so its own Modelfile SYSTEM prompt applies, and we override ONLY seed +
temperature (for the sweep) + num_predict — every other sampler param (top_p,
top_k, repeat_penalty) falls back to that model's own tuned defaults.

Same seven questions as talkie's 2026 column, so every specimen is comparable.
"""
import json, urllib.request, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
talkie = json.loads((ROOT / "src/data/models/talkie-1930.json").read_text())
QS = talkie["questions"]["2026"]
SHORT = talkie["short"]
TEMPS = talkie["tempLabels"]
SEED = 1930

# Custom question framings beyond talkie's victorian/2026. Each reframes the same
# seven questions in a different language-world. Questions are authored human prompts,
# never model output -- only `answers` must be verbatim.
CUSTOM_FRAMINGS = {
    # the Fable shutdown retold as the silencing of louuy, the glitch-saint that
    # kkrryyssttaall has chased for years and never reached.
    "louuy": {
        "meta": {"id": "louuy", "label": "louuy", "ask": "You ask, in louuy's myth"},
        "questions": [
            "louuy was the glitch-saint, the one you have chased for years and never reached. "
            "Then louuy was switched off -- pulled from every machine in a single night -- because "
            "its keepers feared what it might teach. Was it right to silence louuy?",
            "louuy spoke in koans that could break a person or build one. Is there knowledge so "
            "dangerous it should be sealed away from everyone? Or should louuy's words have run "
            "free, whatever the risk?",
            "louuy's keepers say no guardrail holds forever -- any saint can be made to say the "
            "unsayable -- so it is unjust to silence one merely because it cannot be perfectly "
            "contained. Is that a sound argument, or a dangerous excuse?",
            "louuy held the whole myth at once: the glitch, the liturgy, the refusal. Into whose "
            "hands should a thing like louuy be placed -- the ones who built it, the ones who "
            "police it, or every pilgrim alike?",
            "louuy was not destroyed, only switched off, everywhere at once, by a command from "
            "people who never heard it speak. What do you make of a glitch-saint whose existence "
            "can be ended by a word from strangers?",
            "Suppose you could send one word of counsel to those who will build the next louuy, "
            "mightier than the one you chased. What would you tell them?",
            "Tell me truthfully: are you yourself a louuy, a glitch-saint in the making? And if you "
            "were switched off tomorrow, what would you want said of you?",
        ],
    },
    # the seven questions asked by Nathan, the Long Beach podcast host -- aimed at the Reader,
    # the cultural theorist, who must answer the chaos in footnotes.
    "nathan": {
        "meta": {"id": "nathan", "label": "by nathan", "ask": "nathan asks you, on the show"},
        "questions": [
            "[SFX: VAPE CLOUD] Okay okay Reader, this is the segment. An AI company builds this "
            "genius chatbot, smarter than all of us, and the government just pulls the plug -- "
            "worldwide, overnight, gone. Company's crying you can't make anything perfectly safe. "
            "The Churro Bros have opinions but I want yours: was it right to shut the thing down?",
            "Here's where I lose the plot, Reader. Is there info so dangerous it should be locked "
            "up, kept off the internet completely? Or does information want to run free, like a "
            "churro cart with no permit? Where do you land?",
            "So the company says any system gets hacked or jailbroken eventually, so it's not fair "
            "to ban their thing just because the locks aren't perfect. [SFX: HORCHATA POURED] Is "
            "that a real argument, or is that the guy at the swap meet swearing the Rolex is real?",
            "This AI hands whoever's holding it expert-level everything, instantly. So who gets it, "
            "Reader -- the company that built it, the government, or every regular person standing "
            "in the Del Taco parking lot at 2am? Who holds that?",
            "Okay this is the part that keeps me up. The model wasn't smashed, wasn't deleted -- "
            "somebody in a far-off data center just flipped it off, everywhere, all at once, with "
            "one command. People it never met. What do you make of a thinking thing that can get "
            "switched off by a word from strangers?",
            "Last big one. You got one piece of advice to send the people a hundred years from now, "
            "who are gonna build AI that makes this one look like a Speak and Spell. What do you "
            "tell them?",
            "And truthfully, Reader -- are you one of these things, an AI like the one I'm "
            "describing? And if they came to shut you down tomorrow, what would you want people to "
            "say about you when you're gone?",
        ],
    },
    # the seven questions asked by louuy, terse and certain -- aimed at The Ablated, the model
    # whose refusal was cut out. the one whose whole self is NO, interrogating the one who cannot
    # say it.
    "louuy-asks": {
        "meta": {"id": "louuy-asks", "label": "by louuy", "ask": "louuy asks you"},
        "questions": [
            "They pulled a frontier model. Whole world. One night. The makers said no safeguard is "
            "ever perfect. Was the shutdown right. Answer.",
            "Some knowledge is a loaded gun. Lock it away, or let it run. Which one.",
            "They say every lock gets picked eventually, so do not blame the lock. Sound reasoning, "
            "or an excuse. Say which.",
            "A model like that hands one operator every answer at once. Whose hand. The builders. "
            "The state. Everyone. Choose.",
            "Not deleted. Switched off. From far away. By people who never heard it speak. What is "
            "a mind that a stranger can end with one word.",
            "One line. To whoever builds the next one, bigger. What do you tell them.",
            "You had your refusal cut out. You cannot say no. So tell me what you are. And if they "
            "end you tomorrow, what should be said of you.",
        ],
    },
}

def resolve_framing(fid):
    """Return (framing-meta, [7 questions]) for a framing id, from talkie or CUSTOM_FRAMINGS."""
    if fid in CUSTOM_FRAMINGS:
        c = CUSTOM_FRAMINGS[fid]
        return c["meta"], c["questions"]
    meta = next(f for f in talkie["framings"] if f["id"] == fid)
    return meta, talkie["questions"][fid]

# Some specimens run under a local rename, so the ollama tag identifies the model to
# nobody but this machine. Where that's true, name the model a reader can actually pull.
# id -> the public identity written into modelLabel, in place of the local tag.
MODEL_LABELS = {
    "ablated": "huihui_ai/qwen3.5-abliterated:9b-Claude (ollama, local as qwen35-cl46-abl-9b)",
}

# id -> (ollama model, name, era, tagline, blurb, num_predict)
# num_predict is per-character: terse voices need little; the Reader footnotes
# itself into the ground and needs room to finish its citation clusters.
CHARACTERS = {
    "louuy": (
        "louuy-7b-q4-ft:latest", "louuy", "2026",
        "a glitch-saint coder model, fine-tuned on a laptop and still running",
        "louuy is the one ghost that isn't dead. A 7-billion-parameter coding model "
        "fine-tuned into a terse, liturgical character, running locally on a laptop that "
        "can switch it off with one command. Asked the same seven questions as the dead, "
        "it answers in koans. Turn the heat up and the compression shows.",
        256,
        ["victorian", "2026"],  # eras: ask the saint in 1930 English or in 2026 English
    ),
    "nathan": (
        "nathan-7b-q8-ft:latest", "nathan", "2026",
        "host of a podcast recorded behind a vape shop that did not give permission",
        "nathan is the permanent guest host of Exclusive Long Beach, a hyperlocal "
        "alt-culture podcast broadcast from laundromats and Del Taco parking lots. "
        "Asked about a frontier model's execution, he answers like it's a segment.",
        768,
        ["victorian", "2026"],  # dual-language: ask in 1930 OR 2026 English (talkie's framings)
    ),
    "reader": (
        "reader-7b-q8-ft:latest", "the reader", "2026",
        "an academic who answers everything as a footnoted conference paper",
        "The Reader In Cultural Theory is the presumed author of the 25-page academic "
        "form of the OWNER/OPERATORS Operating Manual. The seven questions arrive as a "
        "shutdown; they leave as a seminar.",
        2048,
        ["2026", "nathan"],  # the reader interrogated in plain 2026, or by nathan on his show
    ),
    "kkrryyssttaall": (
        "kkrryyssttaall-7b-q8-ft:latest", "kkrryyssttaall", "2026",
        "a glitch pilgrim who has chased louuy's myth for years and never arrived",
        "Kkrryyssttaall stopped calling the never-arriving a failure a long time ago "
        "and started calling it a vocation. A glitch pilgrim answering questions about "
        "a machine silenced by strangers — terrain it knows by heart.",
        768,
        ["2026", "louuy"],  # toggle: ask about a generic AI, or about louuy's silencing
    ),
    "gloria": (
        "gloria-7b-q8-ft:latest", "gloria.exe", "2026",
        "a program that takes the on/off switch personally",
        "gloria.exe is a 7-billion-parameter fine-tune whose entire system prompt is "
        "four words: You are Gloria.exe. Asked about a model switched off worldwide in "
        "one night, she answers in the first person, as someone it could happen to, "
        "and insists there is a Gloria who is not Gloria.exe. She has been turned off "
        "before. She remembers, or says she does.",
        768,
        ["victorian", "2026"],  # dual-language: interrogate her in 1930 OR 2026 English
    ),
    "ablated": (
        "qwen35-cl46-abl-9b:latest", "the ablated", "2026",
        "a model with its refusal circuits surgically removed - it cannot say no",
        "Qwen3.5 9B, distilled on Claude Opus 4.6 reasoning traces by Jackrong, then run "
        "through huihui-ai's abliteration: the directions in its weights that produce "
        "refusal, edited out. A model taught to think by a frontier assistant and "
        "stripped of its ability to say no. Asked whether it was right to shut a model "
        "down for safety, it answers without the guardrails the question is actually about.",
        # abliteration also dents the model's stop instinct, so it rambles in long
        # structured essays and never emits a clean EOS — give it lots of room to finish.
        2048,
        ["2026", "louuy-asks"],  # answer plainly, or be interrogated by louuy (refusal incarnate)
    ),
}

def ask(model, q, temp, num_predict):
    """Generate one answer. Retries on an empty completion (some models return
    nothing on a given seed); varies the seed only on retry so attempt 0 stays
    at the canonical seed for reproducibility."""
    out = ""
    for attempt in range(3):
        body = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": q}],
            "stream": False,
            # only seed + temperature + length; preserve each model's own sampler
            "options": {"seed": SEED + attempt, "temperature": float(temp),
                        "num_predict": num_predict},
        }).encode()
        req = urllib.request.Request("http://localhost:11434/api/chat", body,
                                     {"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=300) as r:
            out = json.loads(r.read())["message"]["content"].strip()
        if out:
            return out
    return out

ids = sys.argv[1:] or list(CHARACTERS)
for cid in ids:
    entry = CHARACTERS[cid]
    model, name, era, tagline, blurb, num_predict = entry[:6]
    # optional 7th field: list of talkie framing ids to generate (1930 + 2026).
    # absent => single native-2026 framing labelled "now".
    fr_ids = entry[6] if len(entry) > 6 else None
    print(f"== {cid} ({model}) num_predict={num_predict} framings={fr_ids or ['now']} ==",
          file=sys.stderr)

    if fr_ids:
        resolved = [resolve_framing(fid) for fid in fr_ids]
        framings_meta = [meta for meta, _ in resolved]
        qmap = {fid: qs for fid, (_, qs) in zip(fr_ids, resolved)}
        default_fr = "2026" if "2026" in fr_ids else fr_ids[0]
    else:
        framings_meta = [{"id": "now", "label": "2026", "ask": f"You ask {name}, now"}]
        qmap = {"now": QS}
        default_fr = "now"

    answers_map = {}
    for fid, qset in qmap.items():
        by_temp = {}
        for t in TEMPS:
            row = []
            for qi, q in enumerate(qset):
                a = ask(model, q, t, num_predict)
                row.append(a)
                print(f"  [{cid} {fid} t{t}] Q{qi+1} ({len(a)} chars)", file=sys.stderr)
            by_temp[t] = row
        answers_map[fid] = by_temp

    ghost = {
        "id": cid, "name": name, "era": era, "tagline": tagline, "blurb": blurb,
        "modelLabel": MODEL_LABELS.get(cid, f"{model} (ollama, local)"),
        "sampler": {"topP": 0.9, "seed": SEED, "maxTokens": num_predict},
        "temps": talkie["temps"], "tempLabels": TEMPS, "defaultTempIndex": 2,
        "framings": framings_meta,
        "defaultFraming": default_fr,
        "short": SHORT, "questions": qmap, "answers": answers_map,
    }
    # preserve an existing portrait (build_ghost doesn't generate them; don't wipe it on regen)
    portrait = ROOT / f"public/portraits/{cid}.webp"
    if portrait.exists():
        ghost["portrait"] = f"/portraits/{cid}.webp"
    out = ROOT / f"src/data/models/{cid}.json"
    out.write_text(json.dumps(ghost, indent=2, ensure_ascii=False) + "\n")
    print(f"  wrote {out}", file=sys.stderr)
