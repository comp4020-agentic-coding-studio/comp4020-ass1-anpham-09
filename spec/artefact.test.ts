import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// What the deployed artefact must do, over and above the week's spec.
//
// These are contracts I decided on before building the features that satisfy
// them, so this file lands RED and the commits that turn each line green are
// the work. They are all things no other sensor in the roster can see:
// `astro check` doesn't know whether the page survives without JavaScript,
// stylelint doesn't know whether a transition can be turned off, and the
// invariants don't know what this page is arguing.
//
// Every assertion here is about the BUILT output — dist/index.html and the CSS
// it actually ships — because that is what the marker opens.

const DIST = resolve("dist");

const html = () => readFileSync(join(DIST, "index.html"), "utf8");
const doc = () => new JSDOM(html()).window.document;

/** Every rule the browser will actually apply: linked stylesheets + inline. */
function builtCss(): string {
  const linked = readdirSync(DIST, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(DIST, f), "utf8"));
  const inline = [...doc().querySelectorAll("style")].map(
    (s) => s.textContent ?? "",
  );
  return [...linked, ...inline].join("\n");
}

// ---------------------------------------------------------------------------
// The punchline has to land on arrival, not on interaction.
//
// The visitor who reads and leaves, the visitor whose JS bundle 404s, and the
// visitor on a train tunnel connection all get the argument. Interaction
// deepens it; it is not the price of admission.
// ---------------------------------------------------------------------------
describe("artefact: the argument survives arrival", () => {
  it("ships an allocated week in the HTML, not an empty one", () => {
    const readout = doc().querySelector('[data-testid="budget-used"]');
    const hours = Number((readout?.textContent ?? "").match(/\d+/)?.[0] ?? 0);

    expect(
      hours,
      "The served HTML opens on an empty week, so a visitor with no " +
        "JavaScript reads a blank calculator instead of an argument.",
    ).toBeGreaterThan(0);
  });

  it("paints the week grid server-side", () => {
    const cells = doc().querySelectorAll("[data-hour-cell]");
    expect(cells.length, "the grid is a week, so it has 168 cells").toBe(168);

    const spent = [...cells].filter(
      (c) => (c.getAttribute("data-hour-cell") ?? "free") !== "free",
    );
    expect(
      spent.length,
      "Every grid cell is free in the served HTML. The grid is the whole " +
        "visual argument and it has to arrive already made.",
    ).toBeGreaterThan(0);
  });

  it("states its thesis in the markup", () => {
    const thesis = doc().querySelector('[data-testid="thesis"]');
    expect(
      thesis?.textContent?.trim(),
      "no thesis line in the built page — one idea, said out loud, always visible",
    ).toBeTruthy();
  });

  it("draws a conclusion rather than stopping at the data", () => {
    const ending = doc().querySelector('[data-testid="conclusion"]');
    expect(
      ending?.textContent?.trim().length ?? 0,
      "An explainer that stops at the numbers has no point of view. The " +
        "closing section is where the page says what it thinks.",
    ).toBeGreaterThan(80);
  });

  it("ships at least one insight without being touched", () => {
    const insights = doc().querySelectorAll("[data-insight]");
    expect(
      insights.length,
      "the insight panel is empty until a slider moves, so a reader gets nothing",
    ).toBeGreaterThan(0);
  });

  it("tells a no-JS visitor what they are missing", () => {
    expect(
      doc().querySelector("noscript"),
      "no <noscript>. If the bundle fails the page should say so, not " +
        "silently present dead controls.",
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// "Holds up under use it wasn't designed for."
// ---------------------------------------------------------------------------
describe("artefact: holds up under use it wasn't designed for", () => {
  it("lets the visitor turn the motion off", () => {
    expect(
      /prefers-reduced-motion/.test(builtCss()),
      "Transitions and stagger animations with no reduced-motion escape. " +
        "Vestibular disorders are not an edge case.",
    ).toBe(true);
  });

  it("survives being printed", () => {
    expect(
      /@media\s+print/.test(builtCss()),
      "No print stylesheet, so printing the page prints slider tracks.",
    ).toBe(true);
  });

  it("follows the system colour scheme", () => {
    expect(
      /prefers-color-scheme/.test(builtCss()),
      "No dark mode. The marker's OS may well be in it.",
    ).toBe(true);
  });

  it("never measures layout in 100vh", () => {
    // Mobile Safari's address bar makes 100vh lie, and the marker resizes
    // mid-use. dvh/svh/lvh are fine; the bare unit is not.
    const offenders = builtCss().match(/:[^;{}]*\b100vh\b/g) ?? [];
    expect(
      offenders,
      `100vh found in ${offenders.length} declaration(s). Use dvh, or don't ` +
        `do viewport-height layout.`,
    ).toEqual([]);
  });

  it("gives touch a target it can actually hit", () => {
    // WCAG 2.5.5 asks for 44x44. The thumb size is a token precisely so this
    // assertion has one number to read instead of four vendor pseudo-elements.
    const size = Number(
      builtCss().match(/--thumb-size:\s*(\d+)px/)?.[1] ?? "0",
    );
    expect(
      size,
      "Slider thumb is smaller than the 44px WCAG touch target, so the phone " +
        "viewport is mouse-only in practice.",
    ).toBeGreaterThanOrEqual(44);
  });

  it("keeps every colour in a token so a theme can move it", () => {
    // A literal hex inside a rule body is a colour dark mode will not reach.
    const css = builtCss();
    const inVarDefinition = /--[\w-]+:\s*#[0-9a-f]{3,8}/gi;
    const anyHex = /#[0-9a-f]{3,8}\b/gi;

    const total = (css.match(anyHex) ?? []).length;
    const tokenised = (css.match(inVarDefinition) ?? []).length;

    expect(
      total - tokenised,
      `${total - tokenised} hard-coded colour(s) outside a custom property ` +
        `definition. Each one is a colour that will not follow the theme.`,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The controls the page promises.
// ---------------------------------------------------------------------------
describe("artefact: the controls it promises", () => {
  it("asks the visitor to commit to a guess first", () => {
    const d = doc();
    const input = d.querySelector<HTMLInputElement>('[data-testid="guess-input"]');
    expect(input, "no guess input — the reveal has nothing to compare against").toBeTruthy();

    const labelled =
      input?.getAttribute("aria-label") ??
      d.querySelector(`label[for="${input?.id}"]`)?.textContent;
    expect(labelled?.trim(), "the guess input is unlabelled").toBeTruthy();
  });

  it("offers scenarios that stress the budget", () => {
    expect(
      doc().querySelectorAll("[data-scenario]").length,
      "No 'what if' controls. The fragility of the week is the point, and " +
        "one click should be enough to feel it.",
    ).toBeGreaterThanOrEqual(3);
  });

  it("announces its own changes to a screen reader", () => {
    const live = [...doc().querySelectorAll("[aria-live]")];
    const regions = live.map((el) => el.getAttribute("data-testid"));

    expect(regions, "the status verdict must be announced").toContain(
      "status-message",
    );
    expect(regions, "the insight panel must be announced").toContain("insights");
  });

  it("cites a source for every figure it borrows", () => {
    const d = doc();
    const anchors = d.querySelectorAll("[data-anchor-for]");
    if (anchors.length === 0) return; // no borrowed figures, nothing to cite

    const cited = d.querySelector('[data-testid="anchor-source"] a[href*="abs.gov.au"]');
    expect(
      cited,
      "The page shows comparison figures with no link to where they came " +
        "from. An uncited statistic is a made-up statistic.",
    ).toBeTruthy();
  });
});
