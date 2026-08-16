/**
 * The whole argument of this page, in one importable module.
 *
 * A week is 168 hours and that number does not move, so every hour spent on
 * one thing is an hour not spent on another. `summarise` is where that claim
 * actually lives; everything else here is presentation of it.
 *
 * It sits in `src/lib/` rather than inline in `index.astro` for a reason the
 * checks found before I did. A `<script define:vars={...}>` block is treated as
 * `is:inline`, which means no imports, no TypeScript, and no typechecking —
 * `astro check` reported `TOTAL` as an unresolvable name five times over while
 * the page worked fine in the browser. Logic the typechecker cannot see is
 * logic no test can import either, and the one thing this assignment insists on
 * is that the core interaction is testable. So the rule is: the page owns
 * markup, this module owns behaviour, and the script tag is a thin adapter
 * between them.
 *
 * `summarise`, `detailText` and `statusFor` are pure and unit-tested.
 * `sync` is the only function that touches the DOM, and it takes its root as an
 * argument so a test can hand it a JSDOM built from the real `dist/index.html`.
 */

export const TOTAL_HOURS = 168;

export interface Category {
  id: string;
  label: string;
  icon: string;
  max: number;
  step: number;
  colour: string;
  /** Restates the raw weekly figure in a unit people actually feel. */
  detail: (hours: number) => string;
}

const perDay = (hours: number): string => (hours / 7).toFixed(1);

export const CATEGORIES: Category[] = [
  {
    id: "sleep",
    label: "Sleep",
    icon: "🛏️",
    max: 84,
    step: 7,
    colour: "#4361ee",
    detail: (h) => `${perDay(h)} hrs/night`,
  },
  {
    id: "lectures",
    label: "Lectures & classes",
    icon: "📚",
    max: 40,
    step: 1,
    colour: "#e63946",
    detail: (h) => `${h} hrs of class/week`,
  },
  {
    id: "study",
    label: "Study & assignments",
    icon: "📝",
    max: 60,
    step: 1,
    colour: "#2a9d8f",
    detail: (h) => `${h} hrs/week outside class`,
  },
  {
    id: "work",
    label: "Paid work",
    icon: "💼",
    max: 50,
    step: 1,
    colour: "#e9c46a",
    detail: (h) => `${h} hrs/week`,
  },
  {
    id: "exercise",
    label: "Exercise",
    icon: "🏃",
    max: 28,
    step: 1,
    colour: "#7209b7",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "social",
    label: "Socialising",
    icon: "🎉",
    max: 42,
    step: 1,
    colour: "#f77f00",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "commute",
    label: "Commute & errands",
    icon: "🚌",
    max: 28,
    step: 1,
    colour: "#3a86a0",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "selfcare",
    label: "Self-care & meals",
    icon: "🍽️",
    max: 35,
    step: 1,
    colour: "#8338ec",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
];

export type Allocations = Record<string, number>;

/** Names every category, so a preset can never silently omit one. */
const preset = (hours: Record<string, number>): Allocations =>
  Object.fromEntries(CATEGORIES.map(({ id }) => [id, hours[id] ?? 0]));

export const PRESETS: Record<string, Allocations> = {
  fresh: preset({}),
  basics: preset({ sleep: 56, lectures: 15, study: 20 }),
  balanced: preset({
    sleep: 56,
    lectures: 15,
    study: 20,
    work: 10,
    exercise: 5,
    social: 14,
    commute: 7,
    selfcare: 14,
  }),
  allin: preset({
    sleep: 42,
    lectures: 25,
    study: 40,
    work: 20,
    exercise: 7,
    social: 21,
    commute: 10,
    selfcare: 14,
  }),
};

export interface BudgetSummary {
  /** Hours allocated across every category. */
  total: number;
  /** 168 minus the total. Negative once the week is oversubscribed. */
  remaining: number;
  over: boolean;
  /** Bar width as a percentage, clamped so an over-budget week still fits. */
  pct: number;
}

export function summarise(allocations: Allocations): BudgetSummary {
  const total = CATEGORIES.reduce(
    (sum, { id }) => sum + (allocations[id] ?? 0),
    0,
  );
  const remaining = TOTAL_HOURS - total;

  return {
    total,
    remaining,
    over: total > TOTAL_HOURS,
    pct: Math.min((total / TOTAL_HOURS) * 100, 100),
  };
}

export function detailText(id: string, hours: number): string {
  // A zero row says nothing worth saying, and blanking it keeps the card from
  // reflowing as the slider crosses zero.
  if (hours === 0) return " ";
  return CATEGORIES.find((c) => c.id === id)?.detail(hours) ?? "";
}

export function statusFor({ remaining, over }: BudgetSummary): {
  text: string;
  modifier: string;
} {
  if (over) {
    return {
      modifier: "status-over",
      text: `You're ${Math.abs(remaining)} hours over budget. Something has to give.`,
    };
  }
  if (remaining === 0) {
    return {
      modifier: "status-exact",
      text: "Every hour accounted for. No room to breathe.",
    };
  }
  return {
    modifier: "status-under",
    text: `${remaining} hours unallocated — that's ${perDay(remaining)} hrs/day of free time.`,
  };
}

/**
 * Writes a set of allocations onto the page and returns what it computed.
 *
 * `root` is a parameter rather than an assumed `document` so the spec test can
 * pass a JSDOM of the built page: that is what makes "the readout moves when
 * the visitor allocates hours" assertable without a browser.
 */
export function sync(root: ParentNode, allocations: Allocations): BudgetSummary {
  const summary = summarise(allocations);
  const { total, over, pct } = summary;

  for (const { id } of CATEGORIES) {
    const hours = allocations[id] ?? 0;

    const hoursEl = root.querySelector(`[data-hours-for="${id}"]`);
    if (hoursEl) hoursEl.textContent = `${hours} hrs`;

    const detailEl = root.querySelector(`[data-detail-for="${id}"]`);
    if (detailEl) detailEl.textContent = detailText(id, hours);

    const row = root.querySelector(`[data-bar-for="${id}"]`);
    if (row) {
      const share = Math.round((hours / TOTAL_HOURS) * 100);
      const bar = row.querySelector<HTMLElement>(".bar-fill");
      const pctLabel = row.querySelector(".bar-pct");
      if (bar) bar.style.width = `${share}%`;
      if (pctLabel) pctLabel.textContent = `${share}%`;
    }
  }

  const used = root.querySelector<HTMLElement>('[data-testid="budget-used"]');
  if (used) {
    used.textContent = `${total} / ${TOTAL_HOURS} hrs`;
    used.dataset.over = String(over);
  }

  const barFill = root.querySelector<HTMLElement>('[data-testid="budget-bar"]');
  if (barFill) {
    barFill.style.width = `${pct}%`;
    barFill.dataset.over = String(over);
  }

  const status = root.querySelector('[data-testid="status-message"]');
  if (status) {
    const { text, modifier } = statusFor(summary);
    status.className = `status-msg ${modifier}`;
    status.textContent = text;
  }

  return summary;
}
