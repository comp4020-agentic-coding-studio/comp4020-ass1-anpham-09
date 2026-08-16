import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// The grid is 168 coloured squares. That is the whole visual argument, and it
// only works if a square's colour tells you which category it is — so "these
// two categories are the same colour" is a real failure of the page, not a
// matter of taste.
//
// I found one by eye first: exercise and self-care were both purple and I
// could not tell a self-care hour from a gym hour. Fixing that colour was the
// easy half. This file is the other half — the sensor, so the next one gets
// caught by a check instead of by luck.
//
// The metric is OKLab dE. Two earlier attempts are in the history and both
// were wrong: plain RGB distance and hue angle each rated the purples I could
// not tell apart as FURTHER apart than pairs that were obviously distinct.
// OKLab is perceptually uniform, which is the property the whole assertion
// rests on, and it scored the bad pair at 0.106 light / 0.043 dark against a
// palette whose worst honest pair is 0.139.
//
// The floor is deliberately not a maximum. Maximising minimum distance across
// nine colours produces nine gamut extremes — I ran that optimiser, and it
// gave me a neon wall that assigned hot pink to "sleep". A floor lets the
// palette mean something and still be legible.

const DIST = resolve("dist");
const FLOOR = 0.12;

/** Every rule the browser will apply: linked stylesheets plus inline blocks. */
function builtCss(): string {
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const linked = readdirSync(DIST, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(DIST, f), "utf8"));
  const inline = [...new JSDOM(html).window.document.querySelectorAll("style")].map(
    (s) => s.textContent ?? "",
  );
  return [...linked, ...inline].join("\n");
}

const srgb = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/**
 * sRGB hex to OKLab. Björn Ottosson's matrices, verbatim.
 *
 * The point of OKLab over plain RGB is that euclidean distance in it tracks
 * how different two colours *look*. RGB distance does not, which is exactly
 * how the first version of this test passed the bug it was written for.
 */
function oklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) =>
    srgb(parseInt(hex.slice(i, i + 2), 16) / 255),
  ) as [number, number, number];

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function distance(a: string, b: string): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const expand = (hex: string): string =>
  hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(0, 7);

/**
 * The swatch tokens as the given theme defines them.
 *
 * Read in source order and overwritten as they are redefined, so the dark
 * block's values win when it is included — which is how the cascade resolves
 * them in the browser too. The dark rules live inside a media query the
 * minifier may move, so the split is on the query rather than on position.
 */
function swatches(theme: "light" | "dark"): Record<string, string> {
  const css = builtCss();

  // Everything up to the first dark-scheme block is the light theme; the dark
  // theme is that plus whatever the block redefines.
  const darkStart = css.search(/@media[^{]*prefers-color-scheme:\s*dark/);
  const scope = theme === "light" && darkStart >= 0 ? css.slice(0, darkStart) : css;

  const found: Record<string, string> = {};
  for (const [, name, hex] of scope.matchAll(
    /--(cat-[a-z]+|free-cell):\s*(#[0-9a-f]{3,8})/gi,
  )) {
    found[name] = expand(hex);
  }
  return found;
}

describe.each(["light", "dark"] as const)("palette: %s theme", (theme) => {
  it("defines a colour for every category, plus the free hour", () => {
    const found = swatches(theme);
    expect(
      Object.keys(found).sort(),
      `the ${theme} theme is missing swatch tokens, so some cells inherit ` +
        `the other theme's colours`,
    ).toEqual([
      "cat-commute",
      "cat-exercise",
      "cat-lectures",
      "cat-selfcare",
      "cat-sleep",
      "cat-social",
      "cat-study",
      "cat-work",
      "free-cell",
    ]);
  });

  it("keeps every pair of swatches perceptibly apart", () => {
    const found = swatches(theme);
    const names = Object.keys(found).sort();

    const tooClose: string[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d = distance(found[names[i]], found[names[j]]);
        if (d < FLOOR) {
          tooClose.push(
            `${names[i]} (${found[names[i]]}) and ${names[j]} ` +
              `(${found[names[j]]}): dE ${d.toFixed(3)}`,
          );
        }
      }
    }

    expect(
      tooClose,
      `In the ${theme} theme these swatches are closer than dE ${FLOOR}, so a ` +
        `visitor cannot reliably tell one category's hours from another's in ` +
        `the grid or read the legend against it:\n  ${tooClose.join("\n  ")}`,
    ).toEqual([]);
  });
});
