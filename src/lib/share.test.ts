import { describe, expect, it } from "vitest";

import { CATEGORY_IDS, PRESETS } from "./budget";
import { decodeState, encodeState } from "./share";

describe("encode / decode", () => {
  it("round-trips a week unchanged", () => {
    const hash = encodeState({ allocations: PRESETS.balanced });
    expect(decodeState(`#${hash}`).allocations).toEqual(PRESETS.balanced);
  });

  it("round-trips the guess and the active scenarios too", () => {
    const hash = encodeState({
      allocations: PRESETS.basics,
      guess: 45,
      scenarios: ["exam", "shift"],
    });
    const back = decodeState(hash);

    expect(back.guess).toBe(45);
    expect(back.scenarios).toEqual(["exam", "shift"]);
  });

  it("stays short enough to paste into a message", () => {
    expect(encodeState({ allocations: PRESETS.allin }).length).toBeLessThan(60);
  });

  it("returns nothing at all for an empty hash", () => {
    expect(decodeState("")).toEqual({});
    expect(decodeState("#")).toEqual({});
  });
});

// A URL is untrusted input. Every one of these is a hash someone could
// actually land on — hand-edited, truncated by a chat client, or left over
// from an older version of the page.
describe("decode rejects rubbish rather than half-applying it", () => {
  it("ignores a week with the wrong number of categories", () => {
    expect(decodeState("#w=1,2,3").allocations).toBeUndefined();
  });

  it("ignores a week containing something that is not a number", () => {
    const hash = `w=${CATEGORY_IDS.map(() => "x").join(",")}`;
    expect(decodeState(hash).allocations).toBeUndefined();
  });

  it("ignores negative hours", () => {
    const hash = `w=${CATEGORY_IDS.map((_, i) => (i === 0 ? -5 : 1)).join(",")}`;
    expect(decodeState(hash).allocations).toBeUndefined();
  });

  it("clamps an hour above the slider's maximum instead of trusting it", () => {
    // sleep maxes at 84; a hash asking for 900 must not produce a slider
    // position the visitor could never return to.
    const hash = `w=${CATEGORY_IDS.map((_, i) => (i === 0 ? 900 : 0)).join(",")}`;
    expect(decodeState(hash).allocations?.sleep).toBe(84);
  });

  it("drops scenario ids it does not recognise", () => {
    expect(decodeState("#x=exam.nonsense").scenarios).toEqual(["exam"]);
    expect(decodeState("#x=nonsense").scenarios).toBeUndefined();
  });

  it("caps an absurd guess rather than rendering it", () => {
    expect(decodeState("#g=999999").guess).toBe(168);
  });

  it("ignores a guess that is not a number", () => {
    expect(decodeState("#g=soon").guess).toBeUndefined();
  });

  it("keeps a valid guess when the week alongside it is broken", () => {
    // Partial recovery is fine across fields; it is only within the week that
    // half-applying would misassign hours.
    expect(decodeState("#w=1,2&g=30").guess).toBe(30);
  });
});
