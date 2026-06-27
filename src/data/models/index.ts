// Registry of era-ghosts. To add a model: drop a `<slug>.json` in this folder
// (matching the GhostModel shape in src/types.ts), import it, and append it here.
// The other era-specific models from the research pass plug in right here.
import type { GhostModel } from "../../types";
import talkie1930 from "./talkie-1930.json";
import gpt1900 from "./gpt-1900.json";
import louuy from "./louuy.json";
import nathan from "./nathan.json";
import reader from "./reader.json";
import kkrryyssttaall from "./kkrryyssttaall.json";
import ablated from "./ablated.json";
import timecapsule from "./timecapsule.json";

export const MODELS: GhostModel[] = [
  talkie1930 as GhostModel,
  gpt1900 as GhostModel,
  louuy as GhostModel,
  nathan as GhostModel,
  reader as GhostModel,
  kkrryyssttaall as GhostModel,
  ablated as GhostModel,
  // DEV-ONLY: TimeCapsule (1875 base model, too far gone to answer). `import.meta.env.DEV`
  // is statically false in production, so this entry and its JSON are tree-shaken out of
  // prod builds entirely - it never ships and never shows.
  ...(import.meta.env.DEV ? [timecapsule as GhostModel] : []),
];

export const getModel = (id: string): GhostModel =>
  MODELS.find((m) => m.id === id) ?? MODELS[0];
