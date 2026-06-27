// A "ghost": one era-specific language model interviewed about the Fable shutdown.
// Each ghost is a JSON file under src/data/models/, registered in models/index.ts.
// All answers are PRE-GENERATED verbatim model output - the app does no inference.

export interface Framing {
  /** stable key used in `questions` and `answers` maps */
  id: string;
  /** short label for the language toggle, e.g. "1930 English" */
  label: string;
  /** caption above the question, e.g. "You ask, in 1930's words" */
  ask: string;
}

export interface Sampler {
  topP: number;
  seed: number;
  maxTokens: number;
}

export interface GhostModel {
  /** slug, e.g. "talkie-1930" */
  id: string;
  /** model's familiar name, e.g. "talkie" */
  name: string;
  /** the era it was trained up to, e.g. "1930" */
  era: string;
  /** one-line description */
  tagline: string;
  /** optional path to a portrait/profile image, e.g. "/portraits/talkie-1930.webp" */
  portrait?: string;
  /** paragraph intro shown when this ghost is selected */
  blurb: string;
  /** full model identifier for the provenance line */
  modelLabel: string;
  /** sampler settings held constant across every pre-generated answer */
  sampler: Sampler;
  /** numeric temperature stops (display) */
  temps: number[];
  /** string keys into `answers[framing]`, parallel to `temps` */
  tempLabels: string[];
  /** which temp stop the knob starts on */
  defaultTempIndex: number;
  /** language framings (the second knob) */
  framings: Framing[];
  /** framing id the app opens on */
  defaultFraming: string;
  /** short labels for the question picker, one per question */
  short: string[];
  /** framingId -> full question text, one per question */
  questions: Record<string, string[]>;
  /** framingId -> tempLabel -> answer text, one per question */
  answers: Record<string, Record<string, string[]>>;
}
