/**
 * "What if" toggles.
 *
 * Each one on its own is survivable, which is the point: a semester does not
 * break because of one bad week, it breaks because three ordinary things
 * happen at once. They stack, so the visitor can find their own breaking point
 * rather than being shown one.
 *
 * Deltas only ever add. A scenario that quietly took hours back out of sleep
 * would be doing the visitor's hardest decision for them, and that decision is
 * the whole exercise.
 */

import { type Allocations, CATEGORIES, categoryById } from "./budget";

export interface Scenario {
  id: string;
  label: string;
  /** What it does, in the visitor's terms. */
  blurb: string;
  delta: Record<string, number>;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "exam",
    label: "It's exam week",
    blurb: "+15 hrs study",
    delta: { study: 15 },
  },
  {
    id: "shift",
    label: "Pick up a shift",
    blurb: "+8 hrs paid work",
    delta: { work: 8 },
  },
  {
    id: "sick",
    label: "Get sick for two days",
    blurb: "+10 sleep, +10 recovery",
    delta: { sleep: 10, selfcare: 10 },
  },
  {
    id: "faraway",
    label: "Move further out",
    blurb: "+7 hrs commuting",
    delta: { commute: 7 },
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/**
 * Applies every active scenario on top of a base allocation.
 *
 * Clamped to each slider's own maximum so the page can never display a number
 * its own control could not produce — an allocation the visitor cannot get
 * back to by hand is a dead end.
 */
export function applyScenarios(
  base: Allocations,
  active: readonly string[],
): Allocations {
  const result: Allocations = { ...base };

  for (const id of active) {
    const scenario = scenarioById(id);
    if (!scenario) continue;

    for (const [categoryId, delta] of Object.entries(scenario.delta)) {
      const max = categoryById(categoryId)?.max ?? 0;
      const next = (result[categoryId] ?? 0) + delta;
      result[categoryId] = Math.max(0, Math.min(next, max));
    }
  }

  // Normalise so the shape is always every category, never a partial record.
  return Object.fromEntries(
    CATEGORIES.map(({ id }) => [id, result[id] ?? 0]),
  );
}

/**
 * Takes a scenario back out again.
 *
 * Toggling is add-then-subtract on the sliders themselves rather than a second
 * layer of state, so what the sliders show is always the week the page is
 * describing. The one place that isn't exactly reversible is a category that
 * hit its ceiling on the way in; every scenario is sized to stay clear of one
 * from the presets, and a slider that shows a number the visitor can also set
 * by hand is worth more than perfect symmetry.
 */
export function unapplyScenario(
  base: Allocations,
  id: string,
): Allocations {
  const scenario = scenarioById(id);
  if (!scenario) return { ...base };

  const result: Allocations = { ...base };
  for (const [categoryId, delta] of Object.entries(scenario.delta)) {
    result[categoryId] = Math.max(0, (result[categoryId] ?? 0) - delta);
  }

  return Object.fromEntries(CATEGORIES.map(({ id: c }) => [c, result[c] ?? 0]));
}
