import { useEffect, useMemo, useRef, useState } from "react";
import type { GhostModel } from "../types";
import { Waveform } from "./Waveform";
import { Prose } from "./Prose";
import { routeQuestion, warmSearch, type Match } from "../lib/seanceSearch";
import { UNLOCK_ORDER, deriveUnlocked, isUnlocked, readVisited, writeVisited } from "../lib/unlock";
import "./SeancePlayground.css";

interface Props {
  models: GhostModel[];
}

interface Knobs {
  modelId: string;
  framingId: string;
  tempIndex: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Bring an element to the vertical center of the viewport.
 * We deliberately avoid `behavior: "smooth"` and rAF tweens: native smooth
 * scrolling silently no-ops in some engines, and rAF is paused in backgrounded
 * tabs, so either can leave the user stranded. A direct scroll always lands.
 */
function scrollToCenter(el: HTMLElement) {
  el.scrollIntoView({ block: "center" });
}

/** Signal coherence, derived from the actual temperature value. */
const TRACE = { ok: "#46e8b0", warn: "#f5b13a", alarm: "#ff5b52" } as const;
function signal(tempNum: number) {
  if (tempNum <= 0.5) return { key: "ok", label: "COHERENT", color: TRACE.ok } as const;
  if (tempNum <= 1.2) return { key: "warn", label: "DEGRADING", color: TRACE.warn } as const;
  return { key: "alarm", label: "LOST", color: TRACE.alarm } as const;
}

/** Resolve a valid Knobs state for a model, coercing stale framing/index. */
function normalize(model: GhostModel, partial: Partial<Knobs>): Knobs {
  const framingId = model.framings.some((f) => f.id === partial.framingId)
    ? (partial.framingId as string)
    : model.defaultFraming;
  const tempIndex = clamp(
    partial.tempIndex ?? model.defaultTempIndex,
    0,
    model.tempLabels.length - 1,
  );
  return { modelId: model.id, framingId, tempIndex };
}

/** Read initial knobs from the query string (shareable links), else defaults.
 *  A ?m= pointing at a still-locked specimen is ignored (falls back to the lead). */
function initialKnobs(models: GhostModel[]): Knobs {
  const qp = new URLSearchParams(window.location.search);
  const unlocked = deriveUnlocked(readVisited());
  const requested = qp.get("m");
  const model =
    (requested && isUnlocked(requested, unlocked) ? models.find((m) => m.id === requested) : null) ??
    models[0];
  return normalize(model, {
    framingId: qp.get("f") ?? model.defaultFraming,
    tempIndex: qp.has("t") ? parseInt(qp.get("t")!, 10) : model.defaultTempIndex,
  });
}

export function SeancePlayground({ models }: Props) {
  const [knobs, setKnobs] = useState<Knobs>(() => initialKnobs(models));

  // progressive unlock: which specimens the visitor has explored (persisted as a cookie)
  const [visited, setVisited] = useState<Set<string>>(() => readVisited());

  // --- "summon": route a free-typed question to the nearest of the seven ---
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [summoned, setSummoned] = useState<number | null>(null); // index to pulse
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const summon = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setMatch(null);
    setSummoned(null);
    try {
      const m = await routeQuestion(q);
      setMatch(m);
      if (m.accepted) setSummoned(m.index); // scroll happens in the effect, post-layout
    } catch {
      setMatch(null);
    } finally {
      setSearching(false);
    }
  };

  // scroll the matched exchange into view (after the result message has rendered,
  // so the layout shift above the list doesn't derail a smooth scroll), then let
  // the pulse fade on its own
  useEffect(() => {
    if (summoned === null) return;
    const el = itemRefs.current[summoned];
    if (el) scrollToCenter(el);
    const id = window.setTimeout(() => setSummoned(null), 2600);
    return () => window.clearTimeout(id);
  }, [summoned]);

  const model = useMemo(
    () => models.find((m) => m.id === knobs.modelId) ?? models[0],
    [models, knobs.modelId],
  );

  // record the selected specimen as explored; visiting all the open ones opens the next
  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(knobs.modelId)) return prev;
      const next = new Set(prev).add(knobs.modelId);
      writeVisited(next);
      return next;
    });
  }, [knobs.modelId]);

  const unlocked = useMemo(() => deriveUnlocked(visited), [visited]);
  // picker order: unlock order first (starters lead), then any models not in that list
  const ordered = useMemo(() => {
    const byId = new Map(models.map((m) => [m.id, m]));
    const known = UNLOCK_ORDER.map((id) => byId.get(id)).filter((m): m is GhostModel => !!m);
    const extras = models.filter(
      (m) => !UNLOCK_ORDER.includes(m.id as (typeof UNLOCK_ORDER)[number]),
    );
    return [...known, ...extras];
  }, [models]);
  const unlockedCount = ordered.filter((m) => isUnlocked(m.id, unlocked)).length;
  const framing = model.framings.find((f) => f.id === knobs.framingId) ?? model.framings[0];
  const tempLabel = model.tempLabels[knobs.tempIndex];
  const tempNum = parseFloat(tempLabel);
  const maxTemp = Math.max(...model.temps);
  const chaos = clamp(tempNum / (maxTemp || 1), 0, 1);
  const sig = signal(tempNum);
  const questions = model.questions[framing.id];
  const answers = model.answers[framing.id][tempLabel];

  // keep the URL in sync so any knob combination is bookmarkable/shareable
  useEffect(() => {
    const p = new URLSearchParams();
    if (models.length > 1) p.set("m", knobs.modelId);
    p.set("f", knobs.framingId);
    p.set("t", String(knobs.tempIndex));
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, [knobs, models.length]);

  const update = (partial: Partial<Knobs>) =>
    setKnobs((k) => normalize(model, { ...k, ...partial }));

  const selectModel = (id: string) => {
    const next = models.find((m) => m.id === id) ?? models[0];
    setKnobs(normalize(next, {})); // reset to the new specimen's defaults
  };

  return (
    <figure className="rig" aria-label="Signal analysis: interrogate the specimen">
      {/* ============ LEFT: the instrument, stationary ============ */}
      <div className="rig__panel">
        <div className={`rig__crt is-${sig.key}`}>
          <Waveform chaos={chaos} color={sig.color} />
          <div className="rig__crt-tl">
            <span className="rig__chip rig__chip--id">{model.name.toUpperCase()}</span>
            <span className="rig__chip">{framing.label.toUpperCase()}</span>
          </div>
          {model.portrait && (
            <span
              className={`rig__mug is-${sig.key}`}
              style={{
                boxShadow: `0 0 0 1px #04110d, 0 4px 14px rgba(0,0,0,0.55), 0 0 ${(14 * chaos).toFixed(1)}px ${sig.color}`,
              }}
            >
              <img
                src={model.portrait}
                alt={`${model.name}, the ${model.era} specimen`}
                width={84}
                height={84}
                loading="lazy"
                style={{
                  filter: `blur(${(chaos * 2.2).toFixed(2)}px) contrast(${(1 + chaos * 0.5).toFixed(2)}) saturate(${(1 - chaos * 0.7).toFixed(2)}) brightness(${(1 - chaos * 0.1).toFixed(2)})`,
                }}
              />
              <span className="rig__mug-static" style={{ opacity: (chaos * 0.85).toFixed(2) }} />
            </span>
          )}
          <div className="rig__crt-br">
            <span className={`rig__signal is-${sig.key}`}>
              <i className="rig__dot" />
              SIGNAL · {sig.label}
            </span>
            <span className="rig__t">t = {tempLabel}</span>
          </div>
        </div>

        <div className="rig__deck">
          <div className="rig__field">
            <span className="rig__label">
              Specimen <b className="rig__count">{unlockedCount}/{ordered.length} recovered</b>
            </span>
            <div className="rig__seg rig__seg--specimen" role="radiogroup" aria-label="Specimen">
              {ordered.map((m) =>
                isUnlocked(m.id, unlocked) ? (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={m.id === model.id}
                    className={`rig__seg-btn${m.id === model.id ? " is-on" : ""}`}
                    onClick={() => selectModel(m.id)}
                  >
                    {m.name} · {m.era}
                  </button>
                ) : (
                  <button
                    key={m.id}
                    type="button"
                    className="rig__seg-btn is-locked"
                    disabled
                    aria-label="Locked specimen - keep exploring to recover this signal"
                    title="Signal not yet recovered - keep exploring"
                  >
                    ▓▓▓▓ · ████
                  </button>
                ),
              )}
            </div>
          </div>

          {model.framings.length > 1 && (
            <div className="rig__field">
              <span className="rig__label">
                Era <em>ask &amp; answer in</em>
              </span>
              <div className="rig__seg rig__seg--era" role="radiogroup" aria-label="Era">
                {model.framings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={f.id === framing.id}
                    className={`rig__seg-btn${f.id === framing.id ? " is-on" : ""}`}
                    onClick={() => update({ framingId: f.id })}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="rig__field rig__field--temp">
            <span className="rig__label">
              Temperature <b className="rig__readout">{tempLabel}</b>
            </span>
            <input
              type="range"
              min={0}
              max={model.tempLabels.length - 1}
              step={1}
              value={knobs.tempIndex}
              aria-label="Temperature"
              onChange={(e) => update({ tempIndex: +e.target.value })}
            />
            <span className="rig__ticks">
              {model.tempLabels.map((t, i) => (
                <i key={t} className={i === knobs.tempIndex ? "is-on" : ""}>
                  {t}
                </i>
              ))}
            </span>
          </label>
        </div>
      </div>

      {/* ============ RIGHT: the whole conversation ============ */}
      <div className="rig__convo">
        <form className="rig__summon" onSubmit={summon}>
          <label className="rig__summon-label" htmlFor="rig-summon-input">
            Ask the spirit, in your own words
          </label>
          <div className="rig__summon-row">
            <input
              id="rig-summon-input"
              className="rig__summon-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={warmSearch}
              placeholder="e.g. Should they have pulled the plug?"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="rig__summon-btn" disabled={searching || !query.trim()}>
              {searching ? "Listening..." : "Summon"}
            </button>
          </div>
          {match &&
            (match.accepted ? (
              <p className="rig__summon-msg is-heard">
                The spirit hears you. It answers as if you asked:{" "}
                <em>&ldquo;{match.short}&rdquo;</em>
              </p>
            ) : (
              <p className="rig__summon-msg is-lost">
                The spirit does not understand. Ask another way, or choose from the seven below.
              </p>
            ))}
        </form>

        <ol className="rig__exchanges">
          {questions.map((q, i) => (
            <li
              className={`rig__xchg${summoned === i ? " is-summoned" : ""}`}
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <p className="rig__q">
                <span className="rig__q-n">{String(i + 1).padStart(2, "0")}</span>
                <span>{q}</span>
              </p>
              <div className={`rig__a is-${sig.key}`}>
                <Prose text={answers[i]} />
              </div>
            </li>
          ))}
        </ol>

        <figcaption className="rig__note">
          Every line is {model.name}'s real, pre-generated output at seed {model.sampler.seed}.
          Same specimen, same seed, same seven questions
          {model.framings.length > 1 ? "; only the temperature and the century you ask in move" : ""}
          . Push the temperature to the top of the scale and the {model.era} voice loses signal and
          decays into static.
        </figcaption>
      </div>
    </figure>
  );
}
