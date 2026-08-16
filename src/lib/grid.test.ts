import { describe, expect, it } from "vitest";

import { PRESETS, TOTAL_HOURS, preset } from "./budget";
import { FREE, cellCounts, weekFor } from "./grid";

describe("weekFor", () => {
  it("always produces exactly one cell per hour of the week", () => {
    for (const [name, allocations] of Object.entries(PRESETS)) {
      expect(weekFor(allocations).cells, name).toHaveLength(TOTAL_HOURS);
    }
  });

  it("leaves an empty week entirely free", () => {
    const week = weekFor(PRESETS.fresh);
    expect(week.cells.every((c) => c === FREE)).toBe(true);
    expect(week.overflow).toBe(0);
  });

  it("gives each category exactly as many cells as it has hours", () => {
    const counts = cellCounts(weekFor(PRESETS.balanced));
    expect(counts.sleep).toBe(56);
    expect(counts.study).toBe(20);
    expect(counts.social).toBe(14);
  });

  it("free cells are the hours left over", () => {
    const counts = cellCounts(weekFor(PRESETS.balanced));
    // balanced spends 141
    expect(counts[FREE]).toBe(TOTAL_HOURS - 141);
  });

  it("fills essentials before commitments before choices", () => {
    // The order is the argument: what is left at the end is what is actually
    // free, not an arbitrary slice of the middle.
    const { cells } = weekFor(PRESETS.balanced);
    const firstOf = (id: string) => cells.indexOf(id);

    expect(firstOf("sleep")).toBeLessThan(firstOf("study"));
    expect(firstOf("study")).toBeLessThan(firstOf("social"));
    expect(firstOf("social")).toBeLessThan(firstOf(FREE));
  });

  it("reports the hours that do not fit rather than silently dropping them", () => {
    const week = weekFor(PRESETS.allin); // 179 hours
    expect(week.cells).toHaveLength(TOTAL_HOURS);
    expect(week.overflow).toBe(11);
    expect(week.cells).not.toContain(FREE);
  });

  it("never renders a negative allocation as cells", () => {
    const week = weekFor(preset({ sleep: -20, study: 10 }));
    expect(cellCounts(week).study).toBe(10);
    expect(cellCounts(week)[FREE]).toBe(TOTAL_HOURS - 10);
  });
});

// ---------------------------------------------------------------------------
// The hours that don't fit are the whole point of the page, and until now the
// grid knew only how *many* there were. A count can be written in a caption;
// it can't be drawn. Keeping the spilled cells — with the category that spilled
// them — is what lets the debt break out of the 168 visually, which is the one
// moment the argument stops being arithmetic and becomes a picture.
// ---------------------------------------------------------------------------
describe("hours that don't fit", () => {
  it("keeps the spilled hours, not just a tally of them", () => {
    const week = weekFor(PRESETS.allin); // 179 hours
    expect(week.debt).toHaveLength(11);
    expect(week.debt.length).toBe(week.overflow);
  });

  it("still renders exactly 168 cells no matter how far over the week goes", () => {
    const week = weekFor(preset({ sleep: 84, study: 60, work: 50, social: 42 }));
    expect(week.cells).toHaveLength(TOTAL_HOURS);
    expect(week.debt).toHaveLength(236 - TOTAL_HOURS);
  });

  it("spills the discretionary hours, because those are filled last", () => {
    // Not an implementation detail: the grid fills essentials first so that
    // what overflows is what you chose, and the page can say so.
    //
    // 84 + 40 + 40 = 164 committed, so only 4 of the 42 social hours fit and
    // the other 38 are the debt. My first fixture put study at 60 and had the
    // commitments overflowing too — which is also true of a real week, but it
    // isn't what this test is about.
    const week = weekFor(preset({ sleep: 84, lectures: 40, study: 40, social: 42 }));
    expect(new Set(week.debt)).toEqual(new Set(["social"]));
    expect(week.debt).toHaveLength(38);
  });

  it("has nothing to spill when the week fits", () => {
    expect(weekFor(PRESETS.balanced).debt).toEqual([]);
    expect(weekFor(PRESETS.fresh).debt).toEqual([]);
  });
});
