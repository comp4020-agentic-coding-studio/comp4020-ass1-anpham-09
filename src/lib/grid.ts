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
  /**
   * The hours that did not fit, each still carrying the category that spilled
   * it. Empty unless the week is oversubscribed.
   *
   * This used to be a count. A count can be written into a caption but it
   * cannot be drawn, and the moment the page is really built for is the one
   * where the debt stops being a number and becomes cells sitting outside the
   * 168 with nowhere to go.
   */
  debt: Cell[];
  /** `debt.length`, kept because the caption and the grid's data attribute read it. */
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
  const debt: Cell[] = [];

  for (const { id } of ordered) {
    const hours = Math.max(0, Math.round(allocations[id] ?? 0));
    for (let i = 0; i < hours; i++) {
      if (cells.length < TOTAL_HOURS) cells.push(id);
      else debt.push(id);
    }
  }

  while (cells.length < TOTAL_HOURS) cells.push(FREE);

  return { cells, debt, overflow: debt.length };
}

/**
 * The line under the grid.
 *
 * It lived as a ternary in two places — `index.astro`'s frontmatter and
 * `render.ts` — which is exactly the shape the "every rendered number comes
 * from one pure function" rule exists to prevent. It also used to say
 * "N hours don't fit in the week at all", which the debt block above it now
 * says better and in red; a caption repeating the thing it sits under is a
 * caption doing nothing.
 */
export function captionFor(week: Week): string {
  if (week.overflow > 0) return "Every one of the 168 is already spoken for.";

  const free = week.cells.filter((c) => c === FREE).length;
  return `${free} hours still free.`;
}

/** How many cells each category ended up owning, for the legend. */
export function cellCounts(week: Week): Record<Cell, number> {
  const counts: Record<Cell, number> = {};
  for (const cell of week.cells) counts[cell] = (counts[cell] ?? 0) + 1;
  return counts;
}
