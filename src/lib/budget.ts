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
 * is that the core interaction is testable.
 *
 * Everything here is pure. `src/lib/render.ts` is the only module that touches
 * a DOM, and it imports from this one — which is what lets `index.astro`'s
 * frontmatter and the browser compute the same numbers from the same code.
 */

export const TOTAL_HOURS = 168;
export const DAYS = 7;

/**
 * What an hour is *for*, which is not the same as what it is spent on.
 *
 * The distinction is the argument: essentials and commitments are claimed
 * before the week starts, and what people call "free time" is the remainder.
 * The grid and the insight engine both read this.
 */
export type Group = "essential" | "committed" | "discretionary";

export interface Category {
  id: string;
  label: string;
  icon: string;
  group: Group;
  max: number;
  step: number;
  colour: string;
  /** Restates the raw weekly figure in a unit people actually feel. */
  detail: (hours: number) => string;
  /**
   * A published average to sit behind the bar, where one honestly exists.
   * Most categories have none: see the sourcing rule in CLAUDE.md.
   */
  anchor?: { hours: number; label: string };
}

const perDay = (hours: number): string => (hours / DAYS).toFixed(1);

export const CATEGORIES: Category[] = [
  {
    id: "sleep",
    label: "Sleep",
    icon: "🛏️",
    group: "essential",
    max: 84,
    step: 7,
    colour: "var(--cat-sleep)",
    detail: (h) => `${perDay(h)} hrs/night`,
    // ABS Time Use Survey 2020–21: Australians averaged about 8½ hours of
    // sleep a day. Sleep is near-universal, so a per-person daily average is
    // a fair thing to convert to a week. Most other ABS figures in that
    // release are averages among participants only, which is why this is the
    // one category carrying an anchor.
    anchor: { hours: 59.5, label: "ABS average: 8.5 hrs/night" },
  },
  {
    id: "lectures",
    label: "Lectures & classes",
    icon: "📚",
    group: "committed",
    max: 40,
    step: 1,
    colour: "var(--cat-lectures)",
    detail: (h) => `${h} hrs of class/week`,
  },
  {
    id: "study",
    label: "Study & assignments",
    icon: "📝",
    group: "committed",
    max: 60,
    step: 1,
    colour: "var(--cat-study)",
    detail: (h) => `${h} hrs/week outside class`,
  },
  {
    id: "work",
    label: "Paid work",
    icon: "💼",
    group: "committed",
    max: 50,
    step: 1,
    colour: "var(--cat-work)",
    detail: (h) => `${h} hrs/week`,
  },
  {
    id: "exercise",
    label: "Exercise",
    icon: "🏃",
    group: "discretionary",
    max: 28,
    step: 1,
    colour: "var(--cat-exercise)",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "social",
    label: "Socialising",
    icon: "🎉",
    group: "discretionary",
    max: 42,
    step: 1,
    colour: "var(--cat-social)",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "commute",
    label: "Commute & errands",
    icon: "🚌",
    group: "committed",
    max: 28,
    step: 1,
    colour: "var(--cat-commute)",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
  {
    id: "selfcare",
    label: "Self-care & meals",
    icon: "🍽️",
    group: "essential",
    max: 35,
    step: 1,
    colour: "var(--cat-selfcare)",
    detail: (h) => `${perDay(h)} hrs/day`,
  },
];

export const CATEGORY_IDS = CATEGORIES.map(({ id }) => id);

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export type Allocations = Record<string, number>;

/** Names every category, so a preset can never silently omit one. */
export const preset = (hours: Record<string, number>): Allocations =>
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

/**
 * What the page opens on.
 *
 * Deliberately not an empty week. A blank set of sliders is a calculator and
 * asks the visitor to do the work of finding the point; an already-allocated
 * modest week *is* the point, and it is legible to someone who never touches
 * a control. `index.astro` renders this in frontmatter so it survives with
 * JavaScript switched off.
 */
export const DEFAULT_ALLOCATION: Allocations = PRESETS.balanced;

export interface BudgetSummary {
  /** Hours allocated across every category. */
  total: number;
  /** 168 minus the total. Negative once the week is oversubscribed. */
  remaining: number;
  over: boolean;
  /** Bar width as a percentage, clamped so an over-budget week still fits. */
  pct: number;
  /** Hours in categories claimed before the week starts. */
  committed: number;
  /** Hours the visitor chose to spend on themselves. */
  discretionary: number;
}

export function hoursIn(allocations: Allocations, group: Group): number {
  return CATEGORIES.filter((c) => c.group === group).reduce(
    (sum, { id }) => sum + (allocations[id] ?? 0),
    0,
  );
}

/**
 * Going over 168 is allowed, and the page says so rather than preventing it.
 *
 * The alternative I considered was a hard constraint: raising one slider steals
 * hours from another, so the total can never exceed 168. That enforces the
 * arithmetic, but it makes the wrong argument. It says "you cannot overcommit",
 * and the true thing — the thing a student actually recognises — is that you
 * absolutely can, and the hours come out of sleep without you deciding. A page
 * that won't let you build an impossible week can't show you the one you're
 * already living in.
 *
 * So the model is soft: `over` is a fact reported back, not a rule enforced.
 * `pct` clamps at 100 because the bar is a bar, but `remaining` goes negative
 * and stays negative, and `statusFor` names the debt.
 */
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
    committed: hoursIn(allocations, "essential") + hoursIn(allocations, "committed"),
    discretionary: hoursIn(allocations, "discretionary"),
  };
}

export function detailText(id: string, hours: number): string {
  // A zero row says nothing worth saying, and blanking it keeps the card from
  // reflowing as the slider crosses zero.
  if (hours === 0) return " ";
  return categoryById(id)?.detail(hours) ?? "";
}

export interface Status {
  text: string;
  modifier: string;
}

/**
 * The verdict, including the two edge cases worth having a voice about.
 *
 * Takes the raw allocations as well as the summary because "you set sleep to
 * zero" is not a fact about the total — and an explainer with a point of view
 * should have something to say when the visitor tests it.
 */
export function statusFor(
  { remaining, over, total }: BudgetSummary,
  allocations: Allocations = {},
): Status {
  if (total === 0) {
    return {
      modifier: "status-void",
      text:
        "168 hours and nothing to do. That's not a week, that's a void — " +
        "start putting something in it.",
    };
  }
  if ((allocations.sleep ?? 0) === 0) {
    return {
      modifier: "status-over",
      text: "Zero sleep? You'll last about three days. Give it some hours.",
    };
  }
  if (over) {
    return {
      modifier: "status-over",
      text: `You're ${Math.abs(remaining)} hours over budget. Something has to give — and it will, whether you choose it or not.`,
    };
  }
  if (remaining === 0) {
    return {
      modifier: "status-exact",
      text: "Every hour accounted for. No room to breathe, and no room for anything going wrong.",
    };
  }
  return {
    modifier: "status-under",
    text: `${remaining} hours unallocated — that's ${perDay(remaining)} hrs/day of genuinely free time.`,
  };
}

/** Weekly hours restated as the daily minutes they actually cost. */
export function dailyMinutes(weeklyHours: number): number {
  return Math.round((weeklyHours * 60) / DAYS);
}
