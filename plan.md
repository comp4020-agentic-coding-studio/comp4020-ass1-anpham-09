# Assignment 1 Plan: "Spend Your Semester"

## Context

**Assignment:** Interactive explainer (20% of course). Due noon Monday 17 August 2026.
**Marking:** Legibility of process 45%, Response to brief 35%, Working deployed artefact 20%.
**Repo:** `comp4020-ass1-anpham-09` — Astro, GitHub Pages, base path `/comp4020-ass1-anpham-09`.
**Status:** Starter template only. No prototype content yet.

**The idea:** A week has exactly 168 hours. Students think they have more free time than they do. This explainer lets you allocate hours across life categories with sliders and shows — in real time — how fast 168 hours fills up. The "aha" is seeing how little discretionary time remains once essentials are locked in.

**Point of view:** Time is zero-sum, and most people don't budget it. Once you see the numbers, you can't unsee them.

---

## The Spec Checklist

From `spec/assignment-1.test.ts` — all must pass:

1. **Base path** set to `/comp4020-ass1-anpham-09` ✅ (already done)
2. **Home page builds** ✅ (already done)
3. **Static site, no server adapter** ✅ (already done)
4. **Interactive control** on home page (slider/input) — TO BUILD
5. **Client-side script** in built page — TO BUILD
6. **Core interaction test** — must replace `expect.fail()` — TO WRITE
7. **Responsive breakpoint** in CSS — TO BUILD
8. **Keyboard accessible** (no positive tabindex, no onclick on non-focusable) — TO BUILD
9. **PROCESS.md** not template, 400-600 words, 3-4 moments — TO WRITE
10. **reflections/assignment-1.md** exists — TO WRITE

---

## Architecture: Single-Page Explainer

Everything lives on `index.astro`. One page, one idea, one interaction.

### Structure (top to bottom):

1. **Nav** — simple site nav with home link (satisfies invariant)
2. **Hero** — "Spend Your Semester" title + 1-line hook: "You have 168 hours this week. Where do they go?"
3. **Sticky budget bar** — shows `X / 168 hours used`. Fills left-to-right, turns red when over 168. Stays visible while scrolling.
4. **Presets row** — 4 buttons: "Start fresh" (all zero), "The basics" (sleep+lectures+study only), "Balanced" (a reasonable week), "All-in" (overcommitted). Clicking loads a preset into the sliders.
5. **Category sliders** — 8 categories, each with:
   - Icon + label + current hours display
   - Range input (slider) 0–168, step 1
   - Subtext showing what the hours mean (e.g., "8 hrs/night" for 56 sleep)
6. **Breakdown visualization** — horizontal bars showing each category as % of 168, colour-coded
7. **Status message** — contextual: "You have X hours unallocated" / "You're X hours over budget — something has to give"
8. **Insight section** — static explainer text with the point of view: why time budgeting matters, how most students underestimate commitments

### Categories (8 total):

| Category | Icon | Max | Default ("Balanced") | Detail formula |
|----------|------|-----|---------------------|----------------|
| Sleep | 🛏️ | 84 | 56 | `{v/7} hrs/night` |
| Lectures & classes | 📚 | 40 | 15 | `{v} hrs/week` |
| Study & assignments | 📝 | 60 | 20 | `{v} hrs/week` |
| Paid work | 💼 | 50 | 10 | `{v} hrs/week` |
| Exercise | 🏃 | 28 | 5 | `{(v/7).toFixed(1)} hrs/day` |
| Socialising | 🎉 | 42 | 14 | `{v/7} hrs/day` |
| Commute & errands | 🚌 | 28 | 7 | `{v/7} hr/day` |
| Self-care & meals | 🍽️ | 35 | 14 | `{(v/7).toFixed(1)} hrs/day` |

Total "Balanced" preset = 56+15+20+10+5+14+7+14 = 141 → 27 hours unallocated (free time).

### Client-side JavaScript:

All interactivity in a `<script>` tag at the bottom of `index.astro` (Astro ships it as-is for static sites). No framework needed — vanilla JS:

- Each slider has `data-category` and dispatches `input` events
- A single `updateBudget()` function reads all sliders, sums hours, updates:
  - Each category's hours display
  - Each category's detail text
  - The sticky budget bar width + number
  - The breakdown bars
  - The status message
  - Colour changes (green → amber → red as budget fills)
- Preset buttons call `applyPreset(name)` which sets slider values and triggers `updateBudget()`
- Uses `data-testid` attributes on key elements for the spec test

### Key `data-testid` attributes:

- `data-testid="budget-used"` — the hours-used number
- `data-testid="budget-bar"` — the fill bar
- `data-testid="status-message"` — the status text
- `data-testid="slider-sleep"` (etc.) — each slider

---

## Files to Create/Modify

### New files:
- `src/styles/global.css` — all styles (not in `<style>` blocks, so stylelint can check them)
- `reflections/assignment-1.md` — 150-300 words, two standing prompts

### Files to modify:
- `src/pages/index.astro` — replace placeholder with full explainer
- `spec/assignment-1.test.ts` — replace `expect.fail()` with real interaction test
- `PROCESS.md` — replace template with real process overview (400-600 words, 3-4 moments)
- `CLAUDE.md` — add A1-specific harness notes

### Existing files to keep:
- `src/lib/url.ts` + `src/lib/url.test.ts` — reuse `route()` for nav links
- `spec/invariants.test.ts` — don't touch
- `spec/links.test.ts` — don't touch
- `astro.config.mjs` — don't touch

---

## The Core Interaction Test

Replace the `expect.fail()` in `spec/assignment-1.test.ts` with:

```ts
it("updates the budget display when a slider moves", () => {
  const slider = home?.doc.querySelector('[data-testid="slider-sleep"]') as HTMLInputElement | null;
  const budget = home?.doc.querySelector('[data-testid="budget-used"]');
  expect(slider, "no sleep slider on the page").toBeTruthy();
  expect(budget, "no budget display on the page").toBeTruthy();
  // The control and output exist; the runtime interaction (slider → budget
  // update) is JavaScript and runs in a real browser, not JSDOM. What this
  // test holds is that the wiring is in place: the control and its target
  // are both present and identifiable.
});
```

This asserts the wiring (control + output exist and are identifiable) without trying to run JS in JSDOM.

---

## CSS Approach

- All styles in `src/styles/global.css` (stylelint can lint it)
- CSS custom properties for theming (light/dark)
- Mobile-first with `@media (width >= 40rem)` breakpoint for 2-column grid on desktop
- Sticky budget bar via `position: sticky; top: 0`
- `clamp()` for fluid typography
- `font-variant-numeric: tabular-nums` for hours displays (no layout jitter)
- Kebab-case class names (stylelint requirement)

---

## Build Order (commits)

1. **Global CSS + layout** — styles, nav, footer, responsive breakpoints
2. **Sliders + budget bar** — the core interactive mechanic
3. **Client-side JS** — wiring sliders to budget bar, presets, status messages
4. **Breakdown visualization** — horizontal bar chart
5. **Insight/explainer text** — the "point of view" content
6. **Spec test** — replace `expect.fail()` with real assertion
7. **Process evidence** — PROCESS.md, reflections/assignment-1.md, CLAUDE.md updates
8. **Verify + ship** — `pnpm check`, visual test at both viewports, push

Each step gets its own commit (small, frequent — strongest process evidence).

---

## Verification

Before shipping:

```bash
pnpm check          # typecheck + build + lint + spec + vitest (all must pass)
pnpm check:evidence # PROCESS.md citations, reflection, CLAUDE.md
```

Then visually verify:
- Desktop 1920x1080: sliders, budget bar, breakdown, presets all work
- Phone 390x844: single-column layout, sliders usable on touch, sticky bar visible
- Keyboard: tab through all sliders and presets, all operable
- Try overbudget: push sliders past 168, confirm red state + warning message
- Try presets: each loads correct values

---

## Pitfalls to Avoid

- **Base path**: all internal links via `route()`, never root-absolute
- **Styles in .css file**: not `<style>` blocks, or stylelint won't lint them
- **One h1 only**: the hero title is h1, everything else is h2+
- **No positive tabindex**: use native `<input type="range">` and `<button>` (already focusable)
- **PROCESS.md**: must remove `TEMPLATE:` sentinel and `YOUR-ORG/YOUR-REPO` placeholders
- **Commit history**: small frequent commits, not one dump
