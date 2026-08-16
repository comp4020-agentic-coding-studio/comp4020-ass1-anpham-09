# Process overview

## What I built

"Spend Your Semester" is an interactive explainer built on one number. A week
has 168 hours, and every hour spent on one thing is an hour not spent on
something else. Eight sliders cover sleep, classes, study,
paid work, exercise, socialising, commuting and self-care; a budget bar tracks
the total; the hours that don't fit are drawn outside the grid rather than
counted under it
([`e2b25a5`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/e2b25a5)).
The argument is arithmetic, not prose: the "Balanced week" preset sounds modest
and spends 141 of the 168.

## The moments that mattered

1. **A test that named something it never checked.** A test called "updates the
   budget display when a slider moves" asserted only that the slider and the
   readout both existed. It would have stayed green with the JavaScript deleted.
   The sharper assertion I wanted was unwritable, for a structural reason: every
   line of logic lived inside a `<script define:vars>` block, which nothing can
   import. So I moved the structure instead of the test
   ([`515d25c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/515d25c)).
   The real test
   ([`36b68e7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/36b68e7))
   builds a JSDOM from the actual `dist/index.html` and drives the same `sync()`
   the browser calls. I didn't trust it because it passed: commenting out the
   readout write turned exactly those two red, and the other fourteen green.

2. **A sensor that explained itself.** `astro check` kept reporting `TOTAL` as
   an unresolvable name while the page ran perfectly in the browser. I nearly
   filed it as noise. The sixth hint gave the cause: a script tag carrying an
   attribute is treated as `is:inline`, so it gets no imports and no
   typechecking. That hint is why moment 1's diagnosis was structural rather
   than a guess; zeroing the hints
   ([`5468117`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/5468117))
   was the same fix.

3. **Four tests, green, and blind.** A review claimed toggling "It's exam week"
   destroyed slider input. I checked before believing it: study caps at 60, so
   55 + 15 clamps and toggling off returns 45. Real. What mattered was why my
   four round-trip tests missed it — every one started from the "Balanced week"
   preset, which sits clear of every ceiling, so none could reach the clamp.
   They tested the guarantee on a week where it could not fail. A scenario is
   now a lens over the week, not an edit of it, and the replacements start near
   the limits
   ([`57ff2f2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/57ff2f2)).

4. **Two metrics in the bin before one worked.** Exercise and self-care were
   both purple, and in 168 squares I could not tell a self-care hour
   from a gym hour. Recolouring took a minute; the sensor took the afternoon.
   RGB distance rated the pair I couldn't separate at 128.9 against 59.1 for a
   pair that was obviously distinct — backwards. Hue angle ranked them backwards
   too. Both got deleted. OKLab ΔE finally agreed with my eye, then told me my
   eye had caught the wrong pair: study and commute were closer still. So I
   built the palette against the metric — and the optimiser that maximises
   minimum distance reached ΔE 0.165 by assigning hot pink to "sleep". That went
   in the bin too. What shipped is a *floor* of 0.12, hand-tuned, plus
   `spec/palette.test.ts` to hold it
   ([`6f00b42`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/commit/6f00b42)),
   verified by putting the old purple back: light went red, dark stayed green.

## What is still open

Chrome on macOS would not drive a window narrow enough for 390px, so I loaded
the built page into a same-origin 390×844 iframe, where media queries resolve
against the frame: single column, no overflow, verdict intact. What that cannot
tell me is how the sliders feel under a thumb, so they go in front of a person
first. It is also four screens deep before the
first slider, which the desktop split and the strip-back after it
([`d42eaa0...f5bbd37`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-anpham-09/compare/d42eaa0...f5bbd37))
barely move.
