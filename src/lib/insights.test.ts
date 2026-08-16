import { describe, expect, it } from "vitest";

import { type Allocations, PRESETS, preset, summarise } from "./budget";
import { costOfOneMoreHour, insightsFor, revealGuess } from "./insights";

describe("insightsFor", () => {
  it("says something about a week the visitor never touched", () => {
    // The page has to make its point on arrival, so the opening allocation
    // must produce insights rather than an empty panel.
    expect(insightsFor(PRESETS.balanced).length).toBeGreaterThan(0);
  });

  it("never shows more than it was asked for", () => {
    expect(insightsFor(PRESETS.balanced, 2)).toHaveLength(2);
  });

  it("has nothing to say about an empty week", () => {
    // Better silent than padding the panel with an observation that isn't
    // true yet.
    expect(insightsFor(PRESETS.fresh)).toEqual([]);
  });

  it("notices when work outweighs seeing people", () => {
    const ids = insightsFor(preset({ sleep: 56, work: 30, social: 5 })).map((i) => i.id);
    expect(ids).toContain("work-vs-social");
  });

  it("does not claim that when it is false", () => {
    const ids = insightsFor(preset({ sleep: 56, work: 5, social: 30 })).map((i) => i.id);
    expect(ids).not.toContain("work-vs-social");
  });

  it("switches to the overdrawn line once the week does not fit", () => {
    const ids = insightsFor(PRESETS.allin).map((i) => i.id);
    expect(ids).toContain("overdrawn");
    expect(ids).not.toContain("free-per-day");
  });

  it("gives every insight a stable id and non-empty text", () => {
    const seen = new Set<string>();
    for (const preset_ of Object.values(PRESETS)) {
      for (const insight of insightsFor(preset_, 99)) {
        expect(insight.text.length).toBeGreaterThan(10);
        seen.add(insight.id);
      }
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it("never quotes a figure the summary disagrees with", () => {
    // The insight panel restating a different total from the budget bar is the
    // failure that would quietly discredit the whole page.
    const week = preset({ sleep: 56, lectures: 15, study: 20 });
    const { remaining } = summarise(week);
    const perDay = insightsFor(week, 99).find((i) => i.id === "free-per-day");
    expect(perDay?.text).toContain((remaining / 7).toFixed(1));
  });
});

describe("costOfOneMoreHour", () => {
  it("restates a weekly hour as the daily minutes it costs", () => {
    expect(costOfOneMoreHour("work")).toContain("9 minutes");
  });

  it("names the category in the visitor's words", () => {
    expect(costOfOneMoreHour("work")).toContain("paid work");
  });

  it("says nothing about a category that does not exist", () => {
    expect(costOfOneMoreHour("napping")).toBe("");
  });
});

describe("revealGuess", () => {
  it("reports an overestimate as a percentage of reality", () => {
    const reveal = revealGuess(45, 27);
    expect(reveal.direction).toBe("over");
    expect(reveal.errorPct).toBe(67);
    expect(reveal.text).toContain("overestimated by 67%");
  });

  it("reports an underestimate too", () => {
    const reveal = revealGuess(10, 20);
    expect(reveal.direction).toBe("under");
    expect(reveal.text).toContain("underestimated by 50%");
  });

  it("has a line for the visitor who gets it exactly right", () => {
    expect(revealGuess(27, 27).direction).toBe("exact");
  });

  it("does not divide by zero when there is no free time left", () => {
    // An overspent week has negative "free" hours; "Infinity% out" is a bug
    // wearing a joke's clothes.
    const reveal = revealGuess(20, 0);
    expect(Number.isFinite(reveal.errorPct)).toBe(true);
    expect(reveal.text).not.toContain("Infinity");
    expect(reveal.text).toContain("none left");
  });

  it("handles an overdrawn week the same way", () => {
    const reveal = revealGuess(20, -11);
    expect(Number.isFinite(reveal.errorPct)).toBe(true);
    expect(reveal.text).toContain("none left");
  });

  it("refuses a negative guess rather than reporting nonsense", () => {
    expect(revealGuess(-5, 27).text).toContain("You guessed 0 hours");
  });
});

// ---------------------------------------------------------------------------
// The sentence says "less than half". The guard has to mean it.
//
// It used to fire whenever free time was below sleep at all, so a week with 40
// free hours and 56 asleep told the visitor 40 was less than half of 56. On an
// explainer, a number that does not survive being checked costs more than the
// insight was ever worth.
// ---------------------------------------------------------------------------
describe("free-vs-sleep says something arithmetically true", () => {
  const fired = (a: Allocations) =>
    insightsFor(a, 99).find((i) => i.id === "free-vs-sleep");

  it("stays quiet when free time is more than half of sleep", () => {
    // 56 asleep, 72 committed elsewhere, so 40 free. 40 > 28.
    const week = preset({ sleep: 56, study: 40, work: 32 });
    expect(summarise(week).remaining).toBe(40);

    expect(
      fired(week),
      "Claimed 40 free hours is 'less than half' of 56 hours asleep. It is not.",
    ).toBeUndefined();
  });

  it("still fires when free time really is less than half of sleep", () => {
    const week = preset({ sleep: 56, study: 60, work: 32, commute: 10 });
    expect(summarise(week).remaining).toBeLessThan(28);
    expect(fired(week), "the insight has stopped firing when it is true").toBeDefined();
  });

  it("is quiet exactly at the boundary", () => {
    // 56 asleep, 28 free. 28 is not less than half of 56.
    const week = preset({ sleep: 56, study: 60, work: 24 });
    expect(summarise(week).remaining).toBe(28);
    expect(fired(week), "28 is exactly half of 56, not less than half").toBeUndefined();
  });
});
