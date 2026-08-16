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
 * The week the page is editing, and the what-ifs laid over it.
 *
 * `base` is the only thing a visitor's actions change. Scenarios are a lens on
 * it, never an edit of it — which is what makes switching one off give back
 * exactly the week they had.
 *
 * The previous model applied the deltas to the slider values and subtracted
 * them again on the way out. It read more simply and it was lossy: study 55
 * plus exam week clamps at the 60 ceiling, and toggling the scenario off
 * returned 45. I had written a comment arguing that away ("worth more than
 * perfect symmetry"). It wasn't; it was silently discarding something the
 * visitor typed. `scenarios.test.ts` now holds the round trip.
 */
export interface WeekState {
  base: Allocations;
  active: readonly string[];
}

/** Hours the active scenarios add to one category. */
export function deltaFor(
  active: readonly string[],
  categoryId: string,
): number {
  return active.reduce(
    (sum, id) => sum + (scenarioById(id)?.delta[categoryId] ?? 0),
    0,
  );
}

/** The allocation to draw: the base with every active scenario laid over it. */
export function displayed(state: WeekState): Allocations {
  return applyScenarios(state.base, state.active);
}

export function toggleScenario(state: WeekState, id: string): WeekState {
  if (!scenarioById(id)) return state;

  return {
    base: state.base,
    active: state.active.includes(id)
      ? state.active.filter((s) => s !== id)
      : [...state.active, id],
  };
}

/**
 * The visitor drags a slider to `value`, so `value` is what they must see.
 *
 * A scenario is adding hours to this category, so the base has to absorb the
 * difference. It floors at zero: if they drag below what the scenario alone
 * contributes, the scenario's own hours are the floor, and the number they
 * asked for isn't reachable while it's switched on.
 */
export function setCategory(
  state: WeekState,
  categoryId: string,
  value: number,
): WeekState {
  const max = categoryById(categoryId)?.max ?? 0;
  const wanted = Math.max(0, Math.min(value, max));

  return {
    active: state.active,
    base: {
      ...state.base,
      [categoryId]: Math.max(0, wanted - deltaFor(state.active, categoryId)),
    },
  };
}
