// In-browser semantic routing for the séance. We embed the visitor's typed question
// with the same model/dtype used to precompute the shipped question vectors, then
// cosine-match it to one of the seven canonical questions. We NEVER generate an
// answer here; we only route to a pre-generated one (or refuse below the floor).
//
// The model (~30MB quantized) is fetched from the HuggingFace CDN on first use and
// cached by the browser. Keep EMBED_MODEL/EMBED_DTYPE in lockstep with
// scripts/build_question_index.mjs.

import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import index from "../data/question-index.json";

const EMBED_MODEL = index.model;
const EMBED_DTYPE = index.dtype as "q8";
export const MATCH_FLOOR = index.floor;

export interface Match {
  /** index into the model's questions/answers (0-6) */
  index: number;
  /** the canonical short label of the matched question */
  short: string;
  /** cosine similarity of the best match */
  score: number;
  /** margin over the runner-up; small = near-tie between adjacent questions */
  margin: number;
  /** false when score < floor: the spirit doesn't understand */
  accepted: boolean;
}

const cos = (a: number[], b: number[] | Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * (b as number[])[i];
  return s;
};

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
/** Lazily load (and cache) the embedding pipeline. First call downloads the model. */
function getExtractor() {
  if (!extractorPromise) {
    // dynamic import keeps the ~290KB-gzip library out of the main bundle;
    // it (and the wasm runtime) only download when someone actually summons.
    extractorPromise = import("@huggingface/transformers").then(
      ({ pipeline }) =>
        pipeline("feature-extraction", EMBED_MODEL, {
          dtype: EMBED_DTYPE,
        }) as Promise<FeatureExtractionPipeline>,
    );
  }
  return extractorPromise;
}

/** Warm the model in the background (e.g. on first focus of the input). */
export function warmSearch() {
  void getExtractor();
}

/** Embed `query` and route it to the nearest canonical question. */
export async function routeQuestion(query: string): Promise<Match> {
  const extractor = await getExtractor();
  const out = await extractor(query, { pooling: "mean", normalize: true });
  const qv = out.data as Float32Array;

  let best = -1;
  let bestScore = -Infinity;
  let second = -Infinity;
  for (const q of index.questions) {
    const s = cos(q.vec, qv);
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = q.index;
    } else if (s > second) {
      second = s;
    }
  }

  const matched = index.questions[best];
  return {
    index: best,
    short: matched.short,
    score: bestScore,
    margin: bestScore - second,
    accepted: bestScore >= MATCH_FLOOR,
  };
}
