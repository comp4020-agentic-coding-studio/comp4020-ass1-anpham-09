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
