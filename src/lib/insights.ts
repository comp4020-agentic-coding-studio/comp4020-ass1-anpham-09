/**
 * The observations that make the arithmetic land.
 *
 * A total is a fact; "you work more hours than you spend with anyone" is an
 * argument. Every insight here is computed from the visitor's own numbers
 * rather than from a borrowed statistic — which is both more pointed and the
 * only version I can source honestly (see the sourcing rule in CLAUDE.md).
 */

import {
  type Allocations,
  type BudgetSummary,
  CATEGORIES,
  DAYS,
  TOTAL_HOURS,
  categoryById,
  dailyMinutes,
  summarise,
} from "./budget";

export interface Insight {
  /** Stable key, so the DOM can be diffed rather than rebuilt. */
  id: string;
  text: string;
  /** Louder styling for the ones that sting. */
  tone: "neutral" | "sharp";
}

const hrs = (n: number): string => (Number.isInteger(n) ? `${n}` : n.toFixed(1));
const perDay = (weekly: number): string => (weekly / DAYS).toFixed(1);

/**
 * Ordered by how much each one hurts; the panel shows the first few.
 *
 * Each rule returns null when it has nothing true to say, so the panel never
 * pads itself out with an observation that doesn't hold.
 */
type Rule = (a: Allocations, s: BudgetSummary) => Insight | null;

const RULES: Rule[] = [
  // The headline comparison: free time against the thing people assume is the
  // biggest block in their week.
  (a, s) => {
    const sleep = a.sleep ?? 0;
    // Against half, because the sentence says "half". Guarding on `sleep`
    // itself let this fire on 40 free hours against 56 asleep and call 40
    // less than half of 56.
    if (s.over || sleep === 0 || s.remaining >= sleep / 2) return null;
    return {
      id: "free-vs-sleep",
      tone: "sharp",
      text: `Your free time (${hrs(s.remaining)} hrs) is less than half what you spend asleep (${hrs(sleep)} hrs).`,
    };
  },
  (a) => {
    const work = a.work ?? 0;
    const social = a.social ?? 0;
    if (work === 0 || work <= social) return null;
    return {
      id: "work-vs-social",
      tone: "sharp",
      text: `You spend ${hrs(work - social)} more hours earning money than seeing people.`,
    };
  },
  (a) => {
    const study = (a.study ?? 0) + (a.lectures ?? 0);
    const social = (a.social ?? 0) + (a.exercise ?? 0);
    if (study === 0 || study <= social * 2) return null;
    return {
      id: "study-dominates",
      tone: "neutral",
      text: `Classes and study take ${hrs(study)} hrs — more than double everything you do for yourself.`,
    };
  },
  (_a, s) => {
    // An untouched week is 24 free hours a day, which is true and useless.
    // The line only means something once some of it is spoken for.
    if (s.over || s.remaining <= 0 || s.total === 0) return null;
    return {
      id: "free-per-day",
      tone: "neutral",
      text: `Spread across seven days, your free time is ${perDay(s.remaining)} hrs a day — about one evening, minus dinner.`,
    };
  },
  (_a, s) => {
    if (!s.over) return null;
    return {
      id: "overdrawn",
      tone: "sharp",
      // "they always do" was an unsourced absolute about every student
      // everywhere. The overdraft is arithmetic and stays stated as fact; where
      // the hours come from is the page's reading, and now says so.
      text: `You are ${hrs(-s.remaining)} hours overdrawn. The week will not stretch, so something here is already coming out of sleep.`,
    };
  },
  (_a, s) => {
    if (s.over || s.committed === 0) return null;
    const share = Math.round((s.committed / TOTAL_HOURS) * 100);
    if (share < 50) return null;
    return {
      id: "committed-share",
      tone: "neutral",
      text: `${share}% of your week is claimed before you choose anything.`,
    };
  },
  (a) => {
    const commute = a.commute ?? 0;
    if (commute < 5) return null;
    return {
      id: "commute-cost",
      tone: "neutral",
      text: `Commuting alone costs you ${dailyMinutes(commute)} minutes a day.`,
    };
  },
];

export function insightsFor(allocations: Allocations, limit = 3): Insight[] {
  const summary = summarise(allocations);
  return RULES.map((rule) => rule(allocations, summary))
    .filter((i): i is Insight => i !== null)
    .slice(0, limit);
}

/**
 * "Adding 1 hour of work = 8.6 fewer minutes of free time per day."
 *
 * Weekly hours are easy to wave away; the daily minutes they cost are not.
 * This is the reframing that makes a one-notch slider move feel like a
 * decision.
 */
export function costOfOneMoreHour(id: string): string {
  const category = categoryById(id);
  if (!category) return "";
  return `One more hour of ${category.label.toLowerCase()} costs ${dailyMinutes(1)} minutes of free time every day.`;
}

export interface GuessReveal {
  text: string;
  /** How wrong they were, as a percentage of reality. Negative = underestimate. */
  errorPct: number;
  direction: "over" | "under" | "exact";
}

/**
 * The gap between what the visitor thinks they have and what the arithmetic
 * says. This is the surprise the whole page is built to deliver, so it is a
 * pure function with tests rather than a string built inline.
 */
export function revealGuess(
  guessHoursPerWeek: number,
  actualFree: number,
): GuessReveal {
  const guess = Math.max(0, Math.round(guessHoursPerWeek));
  const actual = Math.round(actualFree);

  if (guess === actual) {
    return {
      errorPct: 0,
      direction: "exact",
      text: `You guessed ${guess} hours. The arithmetic says ${actual}. Nobody gets that right.`,
    };
  }

  const direction = guess > actual ? "over" : "under";

  // Against zero there is no percentage to quote, and "Infinity% out" is a
  // bug wearing a joke's clothes.
  if (actual <= 0) {
    return {
      errorPct: 100,
      direction,
      text: `You guessed ${guess} free hours. There are none left — the week is already full.`,
    };
  }

  const errorPct = Math.round(((guess - actual) / actual) * 100);
  const verb = direction === "over" ? "overestimated" : "underestimated";

  return {
    errorPct,
    direction,
    text: `You guessed ${guess} hours. The arithmetic says ${actual}. You ${verb} by ${Math.abs(errorPct)}%.`,
  };
}

/** Every category that has a published figure worth sitting behind its bar. */
export const ANCHORED = CATEGORIES.filter((c) => c.anchor !== undefined);
