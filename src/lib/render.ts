/**
 * The only module in the project that touches a DOM.
 *
 * `root` is a parameter rather than an assumed `document` so a test can pass a
 * JSDOM of the built `dist/index.html` and assert on what the visitor would
 * actually see. That one constraint is what makes the core interaction
 * testable without a browser, and it is why every other module here is pure.
 *
 * Everything this writes, `index.astro` has already written once in
 * frontmatter from the same functions. This repaints; it never paints first.
 */

import {
  type Allocations,
  type BudgetSummary,
  CATEGORIES,
  TOTAL_HOURS,
  detailText,
  statusFor,
  summarise,
} from "./budget";
import { type Insight, insightsFor, revealGuess } from "./insights";
import { type Week, captionFor, weekFor } from "./grid";

function docOf(root: ParentNode): Document {
  return "createElement" in root
    ? (root as Document)
    : ((root as Element).ownerDocument as Document);
}

const text = (root: ParentNode, selector: string, value: string): void => {
  const el = root.querySelector(selector);
  if (el) el.textContent = value;
};

/** The state the page draws from. Everything else is derived. */
export interface ViewState {
  allocations: Allocations;
  active: readonly string[];
  guess: number | null;
}

export interface Painted {
  summary: BudgetSummary;
  week: Week;
  insights: Insight[];
}

function paintCategories(root: ParentNode, allocations: Allocations): void {
  for (const { id } of CATEGORIES) {
    const hours = allocations[id] ?? 0;

    text(root, `[data-hours-for="${id}"]`, `${hours} hrs`);
    text(root, `[data-detail-for="${id}"]`, detailText(id, hours));

    const row = root.querySelector(`[data-bar-for="${id}"]`);
    if (row) {
      const share = Math.round((hours / TOTAL_HOURS) * 100);
      const bar = row.querySelector<HTMLElement>(".bar-fill");
      if (bar) bar.style.width = `${share}%`;
      text(row, ".bar-pct", `${share}%`);
    }
  }
}

function paintGrid(root: ParentNode, week: Week): void {
  const grid = root.querySelector<HTMLElement>('[data-testid="week-grid"]');
  if (!grid) return;

  // Scoped to the grid on purpose. The legend swatches carry `data-hour-cell`
  // too — that is how they get their colour from the same CSS — so a
  // document-wide query repaints the legend with hours from the week.
  grid.querySelectorAll("[data-hour-cell]").forEach((cell, i) => {
    cell.setAttribute("data-hour-cell", week.cells[i] ?? "free");
  });

  grid.dataset.overflow = String(week.overflow);

  text(root, '[data-testid="grid-caption"]', captionFor(week));

  paintDebt(root, week);
}

/**
 * The spilled hours, as cells outside the 168.
 *
 * Rebuilt rather than diffed because the count swings by dozens on a single
 * drag, and a wrong-length list of coloured squares is a lie about the week.
 * The container itself is never removed — `data-count` is what the CSS reads
 * to show or hide it, so there is nothing to re-create when the week tips back
 * under 168 and nothing to mis-place when it tips over again.
 */
function paintDebt(root: ParentNode, week: Week): void {
  const wrap = root.querySelector<HTMLElement>('[data-testid="debt"]');
  const cells = root.querySelector('[data-testid="debt-cells"]');
  if (!wrap || !cells) return;

  wrap.dataset.count = String(week.overflow);
  text(root, '[data-testid="debt-count"]', String(week.overflow));

  const d = docOf(root);
  cells.textContent = "";

  for (const cell of week.debt) {
    const span = d.createElement("span");
    span.className = "hour-cell debt-cell";
    span.setAttribute("data-hour-cell", cell);
    cells.append(span);
  }
}

function paintInsights(root: ParentNode, insights: Insight[]): void {
  const panel = root.querySelector('[data-testid="insights"]');
  if (!panel) return;

  const d = docOf(root);
  panel.textContent = "";

  for (const insight of insights) {
    const li = d.createElement("li");
    li.className = "insight";
    li.setAttribute("data-insight", insight.id);
    li.dataset.tone = insight.tone;
    li.textContent = insight.text;
    panel.append(li);
  }
}

function paintGuess(
  root: ParentNode,
  guess: number | null,
  summary: BudgetSummary,
): void {
  const panel = root.querySelector<HTMLElement>('[data-testid="guess-reveal"]');
  if (!panel) return;

  if (guess === null) {
    panel.hidden = true;
    panel.textContent = "";
    return;
  }

  const reveal = revealGuess(guess, summary.remaining);
  panel.hidden = false;
  panel.dataset.direction = reveal.direction;
  panel.textContent = reveal.text;
}

function paintScenarios(root: ParentNode, active: readonly string[]): void {
  for (const button of root.querySelectorAll<HTMLElement>("[data-scenario]")) {
    const on = active.includes(button.dataset.scenario ?? "");
    button.setAttribute("aria-pressed", String(on));
  }
}

/**
 * Draws a whole state and returns what it computed, so a caller (or a test)
 * can assert on the numbers without re-deriving them.
 */
export function render(root: ParentNode, state: ViewState): Painted {
  const { allocations, active, guess } = state;

  const summary = summarise(allocations);
  const week = weekFor(allocations);
  const insights = insightsFor(allocations);

  paintCategories(root, allocations);
  paintGrid(root, week);
  paintInsights(root, insights);
  paintGuess(root, guess, summary);
  paintScenarios(root, active);

  const used = root.querySelector<HTMLElement>('[data-testid="budget-used"]');
  if (used) {
    used.textContent = `${summary.total} / ${TOTAL_HOURS} hrs`;
    used.dataset.over = String(summary.over);
  }

  const bar = root.querySelector<HTMLElement>('[data-testid="budget-bar"]');
  if (bar) {
    bar.style.width = `${summary.pct}%`;
    bar.dataset.over = String(summary.over);
    // Green through amber to red, so the bar carries the verdict before the
    // sentence underneath it does.
    bar.dataset.heat = summary.over
      ? "over"
      : summary.pct > 90
        ? "tight"
        : summary.pct > 70
          ? "warm"
          : "easy";
  }

  const status = root.querySelector('[data-testid="status-message"]');
  if (status) {
    const { text: verdict, modifier } = statusFor(summary, allocations);
    status.className = `status-msg ${modifier}`;
    status.textContent = verdict;
  }

  const page = root.querySelector<HTMLElement>("[data-page]");
  if (page) page.dataset.crunch = String(summary.over);

  return { summary, week, insights };
}
