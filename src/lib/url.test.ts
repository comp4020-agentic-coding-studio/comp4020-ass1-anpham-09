import { describe, expect, it } from "vitest";
import { joinBase } from "./url";

// The base path is the single most likely way to ship a site that works locally
// and 404s when deployed, so the helper that builds every internal href has a
// test of its own rather than being trusted by inspection.
describe("joinBase", () => {
  it("prefixes a route with the base path", () => {
    expect(joinBase("/comp4020-ass1-anpham-09", "menu")).toBe(
      "/comp4020-ass1-anpham-09/menu/",
    );
  });

  it("resolves the home route to the base itself", () => {
    expect(joinBase("/comp4020-ass1-anpham-09", "")).toBe(
      "/comp4020-ass1-anpham-09/",
    );
  });

  it("does not double up slashes, whichever side supplies them", () => {
    expect(joinBase("/comp4020-ass1-anpham-09/", "/menu/")).toBe(
      "/comp4020-ass1-anpham-09/menu/",
    );
  });

  it("still works when the site is served from a domain root", () => {
    expect(joinBase("/", "menu")).toBe("/menu/");
    expect(joinBase("/", "")).toBe("/");
  });

  it("never emits a root-absolute path that skips the base", () => {
    const base = "/comp4020-ass1-anpham-09";

    for (const target of ["", "menu", "about", "visit"]) {
      expect(joinBase(base, target).startsWith(`${base}/`)).toBe(true);
    }
  });
});
