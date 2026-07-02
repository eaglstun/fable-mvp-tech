// Progressive specimen unlock.
//
// On prod the séance opens with a few specimens and reveals the rest one at a time
// as you explore the ones already available; the reader is always last. In dev (or
// with a ?all=1 escape hatch for testing the prod build) the whole roster is open so
// nothing has to be "earned" to test it. Progress is a single cookie of visited ids.

const COOKIE = "fable_seen";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Unlock progression. The first STARTERS ids are open immediately; the rest reveal
// one at a time once everything currently open has been visited. Reader is last.
// Ids not listed here (e.g. a future specimen) are treated as always-open.
export const UNLOCK_ORDER = [
  "talkie-1930",
  "gpt-1900",
  "ablated",
  "louuy",
  "nathan",
  "kkrryyssttaall",
  "gloria",
  "reader",
] as const;
const STARTERS = 3;

/** Dev build, or an explicit ?all=1, opens the entire roster (testing bypass). */
export function allUnlocked(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("all")) {
    return true;
  }
  return false;
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function readVisited(): Set<string> {
  const raw = readCookie(COOKIE);
  return new Set(raw ? raw.split(",").filter(Boolean) : []);
}
export function writeVisited(visited: Set<string>): void {
  writeCookie(COOKIE, [...visited].join(","));
}

/** An id is gated only if it appears in UNLOCK_ORDER beyond the starters. */
function isGated(id: string): boolean {
  return UNLOCK_ORDER.indexOf(id as (typeof UNLOCK_ORDER)[number]) >= STARTERS;
}

/**
 * Derive the unlocked set from what the visitor has explored: reveal the next id in
 * order once every id currently unlocked has been visited. Unknown ids are open.
 */
export function deriveUnlocked(visited: Set<string>): Set<string> {
  if (allUnlocked()) return new Set(UNLOCK_ORDER);
  let n = STARTERS;
  while (n < UNLOCK_ORDER.length && UNLOCK_ORDER.slice(0, n).every((id) => visited.has(id))) {
    n++;
  }
  return new Set(UNLOCK_ORDER.slice(0, n));
}

/** Is this specimen currently selectable? Non-gated ids are always open. */
export function isUnlocked(id: string, unlocked: Set<string>): boolean {
  return !isGated(id) || unlocked.has(id);
}
