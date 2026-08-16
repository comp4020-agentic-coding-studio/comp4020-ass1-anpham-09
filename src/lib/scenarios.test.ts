import { describe, expect, it } from "vitest";

import { CATEGORIES, PRESETS, TOTAL_HOURS, preset, summarise } from "./budget";
import { SCENARIOS, applyScenarios, unapplyScenario } from "./scenarios";

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

describe("toggling back off", () => {
  it("returns the week to exactly where it started", () => {
    for (const { id, label } of SCENARIOS) {
      const on = applyScenarios(PRESETS.balanced, [id]);
      const off = unapplyScenario(on, id);
      expect(off, `${label} did not undo cleanly`).toEqual(PRESETS.balanced);
    }
  });

  it("undoes a stack in any order", () => {
    const ids = SCENARIOS.map((s) => s.id);
    let week = applyScenarios(PRESETS.balanced, ids);
    for (const id of [...ids].reverse()) week = unapplyScenario(week, id);
    expect(week).toEqual(PRESETS.balanced);
  });

  it("never drives a category below zero", () => {
    const empty = applyScenarios(PRESETS.fresh, []);
    expect(unapplyScenario(empty, "exam").study).toBe(0);
  });

  it("leaves the week alone for an id it does not know", () => {
    expect(unapplyScenario(PRESETS.balanced, "nope")).toEqual(PRESETS.balanced);
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
