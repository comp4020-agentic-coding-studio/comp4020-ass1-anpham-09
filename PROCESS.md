# Process overview

## What I built

"Spend Your Semester" is an interactive explainer built on one number. A week
has 168 hours, that number does not move, and every hour spent on one thing is
an hour not spent on something else. Eight sliders cover sleep, classes, study,
paid work, exercise, socialising, commuting and self-care; a budget bar tracks
the total; the verdict flips from hours-remaining to hours-overspent the moment
the week stops fitting. The argument is in the arithmetic, not the prose: the
"Balanced week" preset sounds modest and spends 141 of the 168.

## The moments that mattered

1. **A test that named something it never checked.** A test called "updates the
   budget display when a slider moves" asserted only that the slider and the
   readout both existed. It would have stayed green with the JavaScript deleted.
   The obvious move was a sharper assertion. I couldn't write one, and the
   reason was structural: every line of logic lived inside a
   `<script define:vars>` block, which nothing can import. So I moved the
   structure instead of the test
   ([`515d25c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/515d25c)).
   The real test
   ([`36b68e7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/36b68e7))
   now builds a JSDOM from the actual `dist/index.html` and drives it through
   the same `sync()` the browser calls. I didn't trust it because it passed: I
   commented out the readout write inside `sync()` and confirmed it turned
   exactly those two tests red while leaving the other fourteen green.

2. **A sensor that explained itself.** `astro check` kept reporting `TOTAL` as
   an unresolvable name while the page ran perfectly in the browser. I nearly
   filed it as noise. The sixth hint gave the cause: a script tag carrying an
   attribute is treated as `is:inline`, so it gets no imports and no
   typechecking. That hint is why moment 1's diagnosis was structural rather
   than a guess, and taking the page to zero hints
   ([`5468117`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/5468117))
   was the same fix.

3. **Twice wrong about the rendered page.** I called two bugs from screenshots
   that were not bugs. The breakdown bars had not disappeared; they were below
   the fold. The budget bar was not failing to clamp at 100%; I had caught a
   0.3-second width transition mid-flight. A screenshot is a moment, not a
   state.

4. **Two metrics in the bin before one worked.** Exercise and self-care were
   both purple, and in a grid of 168 squares I could not tell a self-care hour
   from a gym hour. Recolouring took a minute; the sensor took the afternoon.
   RGB distance rated the pair I couldn't separate at 128.9 against 59.1 for a
   pair that was obviously distinct — backwards. Hue angle ranked them backwards
   too. Both got deleted. OKLab ΔE is perceptually uniform and finally agreed
   with my eye, at which point it told me my eye had caught the wrong pair:
   study and commute were closer still. So I built the palette against the
   metric — and the optimiser that maximises minimum distance reached ΔE 0.165
   by assigning hot pink to "sleep". That output went in the bin as well. What
   shipped is a *floor* of 0.12 with the collisions hand-tuned, plus
   `spec/palette.test.ts` to hold it
   ([`6f00b42`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/6f00b42)),
   verified by putting the old purple back and confirming the light theme went
   red while the dark stayed green.

## What is still open

Chrome on macOS would not let me drive a window narrow enough to render the
390px viewport. So I loaded the built page into a same-origin 390×844 iframe,
where media queries resolve against the frame: single column, no horizontal
overflow, verdict intact. What that cannot tell me is how the sliders feel
under a thumb, so they are what I would put in front of a person first.
