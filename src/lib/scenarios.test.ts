import { describe, expect, it } from "vitest";

import { CATEGORIES, PRESETS, TOTAL_HOURS, preset, summarise } from "./budget";
import {
  SCENARIOS,
  type WeekState,
  applyScenarios,
  displayed,
  setCategory,
  toggleScenario,
} from "./scenarios";

describe("scenarios", () => {
  it("only ever names categories that exist", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const scenario of SCENARIOS) {
      for (const id of Object.keys(scenario.delta)) {
        expect(ids, `${scenario.id} targets an unknown category ${id}`).toContain(id);
      }
    }
  });

  it("only ever adds hours", () => {
    // A scenario that quietly took hours back out of sleep would be making the
    // visitor's hardest decision for them.
    for (const scenario of SCENARIOS) {
      for (const delta of Object.values(scenario.delta)) {
        expect(delta, `${scenario.id} removes hours`).toBeGreaterThan(0);
      }
    }
  });

  it("uses url-safe ids, because they go in the hash", () => {
    for (const { id } of SCENARIOS) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("leaves the balanced week survivable on its own", () => {
    // This is the claim the page makes underneath the buttons.
    for (const { id, label } of SCENARIOS) {
      const after = summarise(applyScenarios(PRESETS.balanced, [id]));
      expect(after.over, `${label} alone should not break the week`).toBe(false);
    }
  });

  it("breaks the week once enough of them stack", () => {
    const all = SCENARIOS.map((s) => s.id);
    expect(summarise(applyScenarios(PRESETS.balanced, all)).over).toBe(true);
  });

  it("never produces a value a slider could not reach", () => {
    const maxed = preset(Object.fromEntries(CATEGORIES.map((c) => [c.id, c.max])));
    const after = applyScenarios(maxed, SCENARIOS.map((s) => s.id));

    for (const { id, max } of CATEGORIES) {
      expect(after[id], `${id} exceeded its slider max`).toBeLessThanOrEqual(max);
    }
  });

  it("always returns every category, never a partial record", () => {
    const after = applyScenarios({ sleep: 10 }, ["exam"]);
    for (const { id } of CATEGORIES) {
      expect(after[id]).toBeTypeOf("number");
    }
  });

  it("ignores an unknown scenario id", () => {
    expect(applyScenarios(PRESETS.balanced, ["nope"])).toEqual(PRESETS.balanced);
  });
});

// These four replace an earlier set that tested the same guarantees against
// `unapplyScenario`. They passed, on a function that was losing hours — every
// one of them started from `PRESETS.balanced`, which sits clear of every
// ceiling, so none could ever have caught the clamp. Starting from a week
// that is near its limits is the whole difference.
describe("toggling back off", () => {
  it("returns the week to exactly where it started", () => {
    // Deliberately close to the ceilings the old model lost hours against.
    const base = { ...PRESETS.balanced, study: 55, sleep: 62, commute: 14 };

    for (const { id, label } of SCENARIOS) {
      const on = toggleScenario({ base, active: [] }, id);
      expect(displayed(toggleScenario(on, id)), `${label} did not undo cleanly`)
        .toEqual(base);
    }
  });

  it("undoes a stack in any order", () => {
    const base = { ...PRESETS.balanced, study: 55, sleep: 62 };
    let state: WeekState = { base, active: [] };

    for (const s of SCENARIOS) state = toggleScenario(state, s.id);
    for (const s of [...SCENARIOS].reverse()) state = toggleScenario(state, s.id);

    expect(displayed(state)).toEqual(base);
  });

  it("never drives a category below zero", () => {
    const state = { base: PRESETS.fresh, active: ["exam"] };
    expect(setCategory(state, "study", 0).base.study).toBe(0);
    expect(displayed(setCategory(state, "study", 0)).study).toBe(15);
  });

  it("leaves the week alone for an id it does not know", () => {
    const state = { base: PRESETS.balanced, active: [] };
    expect(displayed(toggleScenario(state, "nope"))).toEqual(PRESETS.balanced);
  });
});

describe("the claim the buttons make", () => {
  it("every scenario is individually affordable but the set is not", () => {
    // Stated once, as arithmetic, so the copy under the buttons cannot drift
    // away from what they actually do.
    const each = SCENARIOS.map(
      (s) => summarise(applyScenarios(PRESETS.balanced, [s.id])).total,
    );
    expect(Math.max(...each)).toBeLessThanOrEqual(TOTAL_HOURS);

    const together = summarise(
      applyScenarios(PRESETS.balanced, SCENARIOS.map((s) => s.id)),
    ).total;
    expect(together).toBeGreaterThan(TOTAL_HOURS);
  });
});

// ---------------------------------------------------------------------------
// Toggling a scenario must not cost the visitor what they typed.
//
// The old model applied deltas to the slider values themselves and subtracted
// them again on the way out. That is lossy the moment a category clamps at its
// ceiling: study 55 + exam week 15 clamps to 60, and switching exam week back
// off leaves 45. The visitor's 55 is gone and nothing told them.
//
// So a scenario is now a *view* over a base allocation, never an edit of it.
// These tests are the contract that keeps it that way.
// ---------------------------------------------------------------------------
describe("scenario state is reversible", () => {
  it("restores the exact allocation when a scenario is switched off", () => {
    const base = { ...PRESETS.balanced, study: 55 };
    const on = toggleScenario({ base, active: [] }, "exam");
    const off = toggleScenario(on, "exam");

    expect(displayed(on).study, "exam week should clamp study at its max").toBe(60);
    expect(
      displayed(off),
      "Switching a scenario off left the visitor with different numbers than " +
        "they had before switching it on. A what-if that edits the week is a " +
        "what-if that destroys it.",
    ).toEqual(base);
  });

  it("survives every scenario being toggled on and off in any order", () => {
    const base = { ...PRESETS.balanced, study: 58, sleep: 60, commute: 12 };
    let state: WeekState = { base, active: [] };

    for (const s of SCENARIOS) state = toggleScenario(state, s.id);
    for (const s of [...SCENARIOS].reverse()) state = toggleScenario(state, s.id);

    expect(state.active).toEqual([]);
    expect(displayed(state), "a full round trip changed the week").toEqual(base);
  });

  it("lets the visitor edit a slider while a scenario is active", () => {
    const base = { ...PRESETS.balanced, study: 20 };
    const on = toggleScenario({ base, active: [] }, "exam");

    // They drag study to 40 while exam week is on; that is the number they
    // want to see, so it is the number the page must show.
    const edited = setCategory(on, "study", 40);
    expect(displayed(edited).study).toBe(40);

    // And switching exam week off leaves the week they built, minus the exam.
    const off = toggleScenario(edited, "exam");
    expect(displayed(off).study).toBe(25);
  });
});
