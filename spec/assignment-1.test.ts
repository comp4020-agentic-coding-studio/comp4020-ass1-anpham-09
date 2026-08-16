import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import config from "../astro.config.mjs";

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

  it("changes what is on screen when the core interaction runs", () => {
    // REPLACE THIS. Name your interaction and assert its observable effect —
    // the marker uses it for a minute, so it has to be the real one, e.g.:
    //
    //   it("moves the depth readout when the slider is dragged", ...)
    //   it("reveals the next branch when a choice is picked", ...)
    //
    // Assert what the visitor SEES change, not which function ran. Prefer a
    // stable hook you own (`[data-testid]`) over a class name you will restyle.
    expect.fail(
      "Describe the core interaction as a test. Until this line is replaced, " +
        "the one thing the brief insists on is unasserted.",
    );
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
