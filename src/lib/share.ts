/**
 * The visitor's week, in the URL.
 *
 * Two reasons this exists and neither is "shareable links are nice". A hash
 * that survives a reload means the marker can resize, refresh and still be
 * looking at the state they built; and a week you can send to someone is a
 * week you have an opinion about, which is the behaviour the page is trying
 * to provoke.
 *
 * Positional encoding keyed to CATEGORY_IDS, so the hash stays short enough to
 * paste into a message. Anything malformed is discarded rather than
 * half-applied: a URL is untrusted input, and a partly-restored week is worse
 * than the default one.
 */

import { type Allocations, CATEGORIES, CATEGORY_IDS, preset } from "./budget";
import { SCENARIOS } from "./scenarios";

export interface SharedState {
  allocations?: Allocations;
  guess?: number;
  scenarios?: string[];
}

const MAX_GUESS = 168;

export function encodeState(state: SharedState): string {
  const parts: string[] = [];

  if (state.allocations) {
    parts.push(
      `w=${CATEGORY_IDS.map((id) => Math.round(state.allocations?.[id] ?? 0)).join(",")}`,
    );
  }
  if (typeof state.guess === "number" && Number.isFinite(state.guess)) {
    parts.push(`g=${Math.round(state.guess)}`);
  }
  if (state.scenarios?.length) {
    parts.push(`x=${state.scenarios.join(".")}`);
  }

  return parts.join("&");
}

export function decodeState(hash: string): SharedState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const state: SharedState = {};

  const week = params.get("w");
  if (week) {
    const raw = week.split(",");
    // Length has to match exactly. A hash from an older category list would
    // otherwise silently assign hours to the wrong sliders.
    if (raw.length === CATEGORY_IDS.length) {
      const values = raw.map((v) => Number(v));
      if (values.every((v) => Number.isFinite(v) && v >= 0)) {
        state.allocations = preset(
          Object.fromEntries(
            CATEGORIES.map(({ id, max }, i) => [
              id,
              Math.min(Math.round(values[i]), max),
            ]),
          ),
        );
      }
    }
  }

  const guess = Number(params.get("g"));
  if (params.get("g") !== null && Number.isFinite(guess) && guess >= 0) {
    state.guess = Math.min(Math.round(guess), MAX_GUESS);
  }

  const scenarios = params.get("x");
  if (scenarios) {
    const known = new Set(SCENARIOS.map((s) => s.id));
    const active = scenarios.split(".").filter((id) => known.has(id));
    if (active.length) state.scenarios = active;
  }

  return state;
}
