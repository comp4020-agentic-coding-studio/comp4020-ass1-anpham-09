import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  PRESETS,
  TOTAL_HOURS,
  type Allocations,
  dailyMinutes,
  detailText,
  statusFor,
  summarise,
} from "./budget";

const nothing: Allocations = Object.fromEntries(
  CATEGORIES.map(({ id }) => [id, 0]),
);

const allocate = (hours: Record<string, number>): Allocations => ({
  ...nothing,
  ...hours,
});

describe("summarise", () => {
  it("starts an empty week with every hour unspent", () => {
    expect(summarise(nothing)).toMatchObject({
      total: 0,
      remaining: TOTAL_HOURS,
      over: false,
      pct: 0,
    });
  });

  it("adds up hours across categories", () => {
    const { total, remaining } = summarise(
      allocate({ sleep: 56, lectures: 15, study: 20 }),
    );
    expect(total).toBe(91);
    expect(remaining).toBe(77);
  });

  it("ignores categories the page does not offer", () => {
    // A stale key in a preset or a saved state should not quietly inflate the
    // total — only the categories on screen can spend hours.
    expect(summarise({ ...nothing, napping: 40 }).total).toBe(0);
  });

  it("treats a missing category as zero rather than NaN", () => {
    expect(summarise({ sleep: 56 }).total).toBe(56);
  });

  it("is not over at exactly 168", () => {
    const summary = summarise(allocate({ sleep: 84, study: 60, work: 24 }));
    expect(summary.total).toBe(TOTAL_HOURS);
    expect(summary.remaining).toBe(0);
    expect(summary.over).toBe(false);
    expect(summary.pct).toBe(100);
  });

  it("goes over by one hour at 169", () => {
    const summary = summarise(allocate({ sleep: 84, study: 60, work: 25 }));
    expect(summary.over).toBe(true);
    expect(summary.remaining).toBe(-1);
  });

  it("clamps the bar at 100% so an overspent week still fits its track", () => {
    const summary = summarise(allocate({ sleep: 84, study: 60, work: 50 }));
    expect(summary.total).toBeGreaterThan(TOTAL_HOURS);
    expect(summary.pct).toBe(100);
  });
});

describe("presets", () => {
  it("gives every category a value in every preset", () => {
    for (const [name, allocations] of Object.entries(PRESETS)) {
      for (const { id } of CATEGORIES) {
        expect(allocations[id], `${name} is missing ${id}`).toBeTypeOf("number");
      }
    }
  });

  it("never offers a preset that cannot be reached with the sliders", () => {
    // A preset above a slider's max would load a value the visitor could see
    // but never get back to after moving it.
    for (const [name, allocations] of Object.entries(PRESETS)) {
      for (const { id, max } of CATEGORIES) {
        expect(allocations[id], `${name}.${id} exceeds the slider max`).toBeLessThanOrEqual(max);
      }
    }
  });

  it("leaves the balanced week under budget and the all-in week over it", () => {
    // These two carry the argument: a reasonable-sounding week still spends
    // most of 168, and a committed one does not fit at all.
    expect(summarise(PRESETS.balanced).over).toBe(false);
    expect(summarise(PRESETS.allin).over).toBe(true);
  });

  it("spends nothing on a fresh week", () => {
    expect(summarise(PRESETS.fresh).total).toBe(0);
  });
});

describe("detailText", () => {
  it("says nothing for a category set to zero", () => {
    expect(detailText("sleep", 0).trim()).toBe("");
  });

  it("restates weekly sleep as hours a night", () => {
    expect(detailText("sleep", 56)).toBe("8.0 hrs/night");
  });

  it("restates daily categories per day", () => {
    expect(detailText("exercise", 7)).toBe("1.0 hrs/day");
  });

  it("leaves weekly categories weekly", () => {
    expect(detailText("study", 20)).toBe("20 hrs/week outside class");
  });

  it("returns a string for a category it does not know", () => {
    expect(detailText("napping", 5)).toBe("");
  });
});

/** statusFor reads the raw allocations too, so always hand it both. */
const verdict = (hours: Record<string, number>) => {
  const allocations = allocate(hours);
  return statusFor(summarise(allocations), allocations);
};

describe("statusFor", () => {
  it("reports the shortfall when the week is oversubscribed", () => {
    const status = verdict({ sleep: 84, study: 60, work: 40 });
    expect(status.modifier).toBe("status-over");
    expect(status.text).toContain("16 hours over budget");
  });

  it("has its own message for a week that lands exactly on 168", () => {
    expect(verdict({ sleep: 84, study: 60, work: 24 }).modifier).toBe("status-exact");
  });

  it("reports free time per day while there are hours left", () => {
    const status = verdict({ sleep: 56 });
    expect(status.modifier).toBe("status-under");
    expect(status.text).toContain("112 hours unallocated");
    expect(status.text).toContain("16.0 hrs/day");
  });

  // The edge cases are where the page's voice either holds or turns back into
  // a calculator, so they get assertions like anything else.
  it("has something to say about an empty week", () => {
    const status = verdict({});
    expect(status.modifier).toBe("status-void");
    expect(status.text).toContain("void");
  });

  it("calls out a week with no sleep in it at all", () => {
    const status = verdict({ study: 60, work: 40 });
    expect(status.text).toContain("not a week anyone survives");
  });

  it("prefers the empty-week line over the no-sleep one", () => {
    // Both are true of an empty week. Being told off for skipping sleep when
    // you have not entered anything yet would be nonsense.
    expect(verdict({}).modifier).toBe("status-void");
  });
});

describe("groups", () => {
  it("counts hours claimed before the visitor chooses anything", () => {
    const summary = summarise(PRESETS.balanced);
    // sleep 56 + selfcare 14 + lectures 15 + study 20 + work 10 + commute 7
    expect(summary.committed).toBe(122);
    expect(summary.discretionary).toBe(19); // exercise 5 + social 14
  });

  it("splits every category into exactly one group", () => {
    const summary = summarise(PRESETS.balanced);
    expect(summary.committed + summary.discretionary).toBe(summary.total);
  });
});

describe("dailyMinutes", () => {
  it("restates one weekly hour as the daily minutes it costs", () => {
    expect(dailyMinutes(1)).toBe(9);
  });

  it("scales", () => {
    expect(dailyMinutes(7)).toBe(60);
  });
});
