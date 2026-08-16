/**
 * The week as 168 cells.
 *
 * The bars say how much; the grid says *how little is left*, which is the
 * claim the page is actually making. Filling it in group order — essentials,
 * then commitments, then what you chose — means the white space at the end is
 * literally the free time, and it shrinks in front of you.
 */

import {
  type Allocations,
  CATEGORIES,
  DAYS,
  type Group,
  TOTAL_HOURS,
} from "./budget";

export const HOURS_PER_DAY = TOTAL_HOURS / DAYS;

/** A cell holds the id of whatever claimed that hour, or "free". */
export type Cell = string;
export const FREE: Cell = "free";

export interface Week {
  /** Exactly 168 cells, in reading order: row = hour, column = day. */
  cells: Cell[];
  /** Hours that did not fit. Zero unless the week is oversubscribed. */
  overflow: number;
}

const FILL_ORDER: Group[] = ["essential", "committed", "discretionary"];

/**
 * Claimed hours first, in group order, then whatever is left over is free.
 *
 * Hours are rounded to whole cells because a cell is an hour and half an hour
 * of grid is not a thing. The rounding is per category rather than at the end,
 * so the grid can be a cell or two off the headline total on fractional
 * inputs; every control on the page steps in whole hours, so in practice it
 * never is.
 */
export function weekFor(allocations: Allocations): Week {
  const ordered = FILL_ORDER.flatMap((group) =>
    CATEGORIES.filter((c) => c.group === group),
  );

  const cells: Cell[] = [];
  let overflow = 0;

  for (const { id } of ordered) {
    const hours = Math.max(0, Math.round(allocations[id] ?? 0));
    for (let i = 0; i < hours; i++) {
      if (cells.length < TOTAL_HOURS) cells.push(id);
      else overflow++;
    }
  }

  while (cells.length < TOTAL_HOURS) cells.push(FREE);

  return { cells, overflow };
}

/** How many cells each category ended up owning, for the legend. */
export function cellCounts(week: Week): Record<Cell, number> {
  const counts: Record<Cell, number> = {};
  for (const cell of week.cells) counts[cell] = (counts[cell] ?? 0) + 1;
  return counts;
}
