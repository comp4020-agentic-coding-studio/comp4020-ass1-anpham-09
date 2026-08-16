import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import config from "../astro.config.mjs";
import { PRESETS, TOTAL_HOURS } from "../src/lib/budget";
import { render } from "../src/lib/render";

/** The page always draws a whole state; these tests only vary the week. */
const sync = (root: ParentNode, allocations: Record<string, number>) =>
  render(root, { allocations, active: [], guess: null }).summary;

// Assignment 1's published spec, turned into backpressure.
//
//   https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-1/
//
// Six lines in the spec. Four of them are mechanically checkable and are
// asserted below. Two are not, and no test in this file pretends otherwise:
//
//   - "one strong idea with a point of view, and nothing else" — scope and
//     judgement. A person reads this. Nothing here can.
//   - the *quality* of the process evidence. `pnpm check:evidence` proves the
//     citations resolve; whether the moments show skilled directing rather
//     than routine retrying is the marker's call, and it is 45% of the mark.
//
// These assert the CONTRACT — what the deployed page must do — not how it is
// built, so they survive a change of approach or of stack.
const DIST = resolve("dist");
const REPO = "comp4020-ass1-anpham-09";

function htmlFiles(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

const pages = htmlFiles().map((path) => ({
  name: relative(DIST, path),
  doc: new JSDOM(readFileSync(path, "utf8")).window.document,
}));

const home = pages.find(({ name }) => name === "index.html");

// ---------------------------------------------------------------------------
// spec: "deployed and live at its public GitHub Pages URL by the deadline"
//
// Whether it is *live* is a fact about the internet at the cutoff, and `ship`
// and `preflight` check that. What this file can hold is the thing that most
// often makes a green local build serve a broken site: the base path. Get it
// wrong and every asset 404s on the live URL while looking perfect on
// `pnpm dev`.
// ---------------------------------------------------------------------------
describe("spec: deployable to its Pages URL", () => {
  it("sets the base path to this repo", () => {
    expect(
      config.base,
      `The site deploys under …github.io/${REPO}/, so base must match the repo ` +
        `name or every asset 404s on the live URL.`,
    ).toBe(`/${REPO}`);
  });

  it("builds a home page", () => {
    expect(home, "dist/index.html is what the Pages URL serves").toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// spec: "static and client-side throughout"
// ---------------------------------------------------------------------------
describe("spec: static and client-side throughout", () => {
  it("builds a fully static site", () => {
    expect(config.output ?? "static").toBe("static");
    expect(
      (config as { adapter?: unknown }).adapter,
      "an adapter means a server runtime, which GitHub Pages will not run",
    ).toBeFalsy();
  });

  it("ships no server entrypoints into dist", () => {
    for (const dir of ["_worker.js", "server", "functions"]) {
      expect(
        existsSync(join(DIST, dir)),
        `dist/${dir} is server-side output; this build must be static`,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// spec: "the visitor does something that changes what they see"
//
// This is the line the brief singles out: "state the core interaction plainly
// enough to write a test for it". These start RED, and they stay red until
// there is an interaction to describe. Turning them green is the work.
//
// The first two are the floor — a real control, and script to drive it. The
// third is yours to write, and no one else can: replace it with an assertion
// about YOUR interaction, named in your own words.
// ---------------------------------------------------------------------------
describe("spec: the visitor changes what they see", () => {
  const CONTROLS =
    "button, input, select, textarea, summary, [role='button'], [role='slider'], [role='tab']";

  it("ships a control the visitor can operate", () => {
    const controls = home ? [...home.doc.querySelectorAll(CONTROLS)] : [];
    expect(
      controls.length,
      "No interactive control on the home page. The brief's whole weight is " +
        "on the visitor doing something, not only reading.",
    ).toBeGreaterThan(0);
  });

  it("ships client-side behaviour", () => {
    const scripts = home ? [...home.doc.querySelectorAll("script")] : [];
    const real = scripts.filter(
      (s) => s.getAttribute("src") !== null || (s.textContent ?? "").trim() !== "",
    );
    expect(
      real.length,
      "No script in the built page, so nothing can change in response to the visitor.",
    ).toBeGreaterThan(0);
  });

  // The core interaction is: move a slider, and the weekly budget readout,
  // the bar and the verdict all move with it. These drive the real built page
  // — a JSDOM of dist/index.html — through the same `sync` the browser calls,
  // so they assert what the visitor sees rather than which function ran.
  //
  // A fresh JSDOM per test, because `sync` mutates it.
  const rendered = () =>
    new JSDOM(readFileSync(join(DIST, "index.html"), "utf8")).window.document;

  it("moves the budget readout when hours are allocated", () => {
    const doc = rendered();
    const readout = doc.querySelector('[data-testid="budget-used"]');
    expect(readout, "no budget readout in the built page").toBeTruthy();

    // The served page opens on an allocated week, not an empty one, so the
    // "before" here is whatever the build rendered.
    const before = readout?.textContent?.trim();

    sync(doc, { ...PRESETS.fresh, sleep: 56 });

    expect(
      readout?.textContent,
      "56 hours of sleep left the budget readout unchanged — the visitor " +
        "moved a slider and nothing happened.",
    ).not.toBe(before);
    expect(readout?.textContent).toContain(`56 / ${TOTAL_HOURS}`);
  });

  it("fills the budget bar in proportion to the hours spent", () => {
    const doc = rendered();
    const bar = doc.querySelector<HTMLElement>('[data-testid="budget-bar"]');
    expect(bar, "no budget bar in the built page").toBeTruthy();

    sync(doc, { ...PRESETS.fresh, sleep: 84 });
    expect(bar?.style.width).toBe("50%");
  });

  it("tells the visitor what is left, and then what is overspent", () => {
    const doc = rendered();
    const status = doc.querySelector('[data-testid="status-message"]');
    expect(status, "no status message in the built page").toBeTruthy();

    sync(doc, PRESETS.balanced);
    expect(status?.textContent, "a balanced week should have hours left over")
      .toContain("unallocated");

    sync(doc, PRESETS.allin);
    expect(
      status?.textContent,
      "the all-in week does not fit in 168 hours, and the page has to say so " +
        "— that verdict is the whole argument.",
    ).toContain("over budget");
  });

  it("keeps every slider's own readout in step with the budget", () => {
    // The per-category numbers are the visitor's evidence for the total. If
    // they drift apart the page is lying about its own arithmetic.
    const doc = rendered();
    sync(doc, PRESETS.balanced);

    const shown = [...doc.querySelectorAll("[data-hours-for]")].map((el) =>
      Number((el.textContent ?? "").replace(/\D/g, "")),
    );
    const total = shown.reduce((sum, hours) => sum + hours, 0);

    expect(doc.querySelector('[data-testid="budget-used"]')?.textContent).toContain(
      `${total} /`,
    );
  });

  // Regression. `paintGrid` used to query the whole document for
  // `[data-hour-cell]`, which also matches the nine legend swatches — they
  // carry the attribute so they take their colour from the same CSS rules. So
  // every repaint overwrote the legend with the first nine hours of the week,
  // and the key to the grid silently stopped being a key to anything.
  it("leaves the legend alone when the week is repainted", () => {
    const doc = rendered();
    const key = () =>
      [...doc.querySelectorAll(".legend-swatch")].map((el) =>
        el.getAttribute("data-hour-cell"),
      );

    const before = key();
    expect(before.length, "no legend in the built page").toBeGreaterThan(0);

    sync(doc, PRESETS.allin);

    expect(
      key(),
      "The legend swatches changed colour when the week did. They name the " +
        "categories; they are not part of the week.",
    ).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// spec: "it works at both marking viewports (desktop and phone)"
//
// A floor, not the contract. The marker opens it at both viewports, resizes
// mid-use and tabs through it; only the last of those is reachable from here.
// Check the live site by hand at a phone width before you ship.
// ---------------------------------------------------------------------------
describe("spec: both marking viewports", () => {
  it("carries at least one responsive breakpoint", () => {
    const css = readdirSync(DIST, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFileSync(join(DIST, f), "utf8"))
      .join("\n");
    const inline = pages
      .flatMap(({ doc }) => [...doc.querySelectorAll("style")])
      .map((s) => s.textContent ?? "")
      .join("\n");

    expect(
      /@media|@container|clamp\(|minmax\(/.test(css + inline),
      "No breakpoint, container query or fluid sizing anywhere in the built " +
        "CSS — a desktop-only layout is a P band on the artefact criterion.",
    ).toBe(true);
  });

  it("keeps the interaction reachable from the keyboard", () => {
    for (const { name, doc } of pages) {
      for (const el of doc.querySelectorAll("[tabindex]")) {
        const value = Number(el.getAttribute("tabindex"));
        expect(
          value,
          `${name}: a positive tabindex reorders the tab sequence and strands ` +
            `keyboard users. Use 0, or a real control.`,
        ).toBeLessThanOrEqual(0);
      }
      for (const el of doc.querySelectorAll("[onclick]")) {
        expect(
          ["BUTTON", "A", "INPUT", "SELECT", "SUMMARY"].includes(el.tagName),
          `${name}: <${el.tagName.toLowerCase()} onclick> is not focusable or ` +
            `operable by keyboard. Use a <button>.`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// spec: "evidence of process is in the repo"
//
// `pnpm check:evidence` already proves PROCESS.md, CLAUDE.md, the reflection
// and the commit citations exist and resolve — that is not duplicated here.
// What it does not know is the two limits this assignment adds on top.
// ---------------------------------------------------------------------------
describe("spec: process evidence", () => {
  const src = existsSync("PROCESS.md") ? readFileSync("PROCESS.md", "utf8") : "";

  const prose = src
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/<!--[\s\S]*?-->/g, "") // template comments
    .replace(/^#{1,6}\s.*$/gm, "") // headings
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // link text, not the URL

  const words = prose.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));

  // Without this the two tests below measure the template and pass on it —
  // the boilerplate happens to be ~500 words with a four-item numbered list.
  // A test that is green before you have written anything is worse than no
  // test, so refuse to measure until the boilerplate is gone.
  it("is your overview, not the template", () => {
    expect(existsSync("PROCESS.md"), "no PROCESS.md in the repo root").toBe(true);
    expect(
      /TEMPLATE: this file is a shape to fill in/.test(src),
      "PROCESS.md still carries the template comment, so the word count and " +
        "moment count below would be measuring the boilerplate.",
    ).toBe(false);
    expect(
      /YOUR-ORG\/YOUR-REPO/.test(src),
      "PROCESS.md still carries the template's placeholder citation URLs.",
    ).toBe(false);
  });

  it("runs to 400–600 words", () => {
    expect(
      words.length,
      `PROCESS.md is ~${words.length} words; this assignment asks for 400–600.`,
    ).toBeGreaterThanOrEqual(400);
    expect(words.length).toBeLessThanOrEqual(600);
  });

  it("carries three or four moments, not more", () => {
    // Moments are the numbered list under "The moments that mattered".
    const section = src.split(/^##\s+.*moments.*$/im)[1] ?? "";
    const moments = (section.split(/^##\s/m)[0] ?? "").match(/^\s*\d+\.\s/gm) ?? [];
    expect(
      moments.length,
      `Found ${moments.length} numbered moment(s). Three or four — each needs ` +
        `room to say what you did instead of the obvious thing, and how you ` +
        `knew the result was right.`,
    ).toBeGreaterThanOrEqual(3);
    expect(moments.length).toBeLessThanOrEqual(4);
  });

  it("keeps the reflection the retro will read", () => {
    expect(
      existsSync("reflections/assignment-1.md"),
      "The week 4 retro reads reflections/assignment-1.md — there is nothing " +
        "to write twice, but it does have to exist.",
    ).toBe(true);
  });
});
