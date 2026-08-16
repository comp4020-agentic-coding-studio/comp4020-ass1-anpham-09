# Process overview

## What I built

"Spend Your Semester" is an interactive explainer built on one number. A week
has 168 hours, that number does not move, and every hour spent on one thing is
an hour not spent on something else. Eight sliders cover sleep, classes, study,
paid work, exercise, socialising, commuting and self-care; a budget bar tracks
the running total; and the verdict flips from hours-remaining to hours-overspent
the moment the week stops fitting. The argument is in the arithmetic rather than
in the prose. The "Balanced week" preset sounds modest and still spends 141 of
the 168; the "All-in" preset does not fit at all.

## The moments that mattered

1. **A test that named something it never checked.** My plan replaced the spec's
   `expect.fail` stub with a test called "updates the budget display when a
   slider moves" whose body asserted only that the slider and the readout both
   existed. It would have stayed green with the JavaScript deleted, and the test
   three lines above it already asserted that a control exists. The obvious move
   was to write a sharper assertion. I couldn't, and the reason was structural:
   every line of logic lived inside a `<script define:vars>` block, which
   nothing can import. So I moved the structure instead of the test
   ([`515d25c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/515d25c)).
   The real test
   ([`36b68e7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/36b68e7))
   now builds a JSDOM from the actual `dist/index.html` and drives it through
   the same `sync()` the browser calls. I didn't trust it because it passed: I
   commented out the readout write inside `sync()` and confirmed it turned
   exactly those two tests red while leaving the other fourteen green.

2. **A sensor that explained itself.** `astro check` kept reporting `TOTAL` as
   an unresolvable name, five times over, while the page ran perfectly in the
   browser. I nearly filed it as noise. The sixth hint was the actual cause: a
   script tag carrying an attribute is treated as `is:inline`, so it gets no
   imports, no TypeScript and no typechecking. That hint is why the diagnosis in
   moment 1 was structural rather than a guess, and taking the page down to zero
   hints
   ([`5468117`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/5468117))
   was the same fix.

3. **Reading the rule instead of silencing it.** stylelint failed the build on
   `-webkit-appearance`. The cheap fix is a disable comment. I checked the rule
   instead: unprefixed `appearance` has been supported since Chrome 84 and
   Safari 15.4, which covers the marking environment, so the prefix was dead
   weight and the linter was simply right
   ([`eba119d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/eba119d)).
   Then I opened the page and looked at the slider thumbs, because no lint rule
   can tell me whether they still draw.

4. **Twice wrong about the rendered page.** I called two bugs from screenshots
   that were not bugs. The breakdown bars had not disappeared; they had been
   pushed below the fold by the detail text that appears once hours are
   allocated. The budget bar was not failing to clamp at 100%; I had caught a
   0.3-second width transition mid-flight, and zooming in showed a full red bar
   and a red readout. Two false alarms inside five minutes taught me the useful
   thing: a screenshot is a moment, not a state, and the fix is to zoom or wait
   before believing it.

## What is still open

Chrome on macOS would not let me drive a window narrow enough to render the
390px viewport, and reading the mobile-first CSS is not seeing it. So I loaded
the built page into a same-origin 390×844 iframe, where media queries resolve
against the frame: single column, no horizontal overflow, over-budget verdict
intact. What that cannot tell me is how the sliders feel under a thumb, so they
are what I would put in front of a person first.
