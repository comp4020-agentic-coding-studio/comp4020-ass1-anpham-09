# Assignment 1

## The breakthrough

It came from reading my own test name. I had written one called "updates the
budget display when a slider moves", and the body checked only that a slider and
a readout both existed on the page. The name was a promise the test never kept.

What made it a breakthrough rather than a bug fix was noticing *why* I had
written it that way. I hadn't been lazy; I had hit a real wall — the logic lived
inside an inline `<script>` block that nothing could import, so there was
genuinely nothing to test against — and I had written a test shaped like the
wall instead of moving it. Once I saw that, the fix was obvious and it wasn't in
the test file at all. Pull the logic into a module, and the assertion I actually
wanted becomes three lines.

Then I broke it on purpose to check it worked. Commenting out one line in
`sync()` turned exactly the two tests that should have failed red. That was the
first time a test told me something I didn't already believe.

## The harness, and a rule I got wrong

The other change was where corrections live. For most of the week I fixed the
agent's output in review, and the fix stayed in the chat — so the next request
started from the same defaults and produced the same competent dashboard.

The redesign went the other way: three rules into `CLAUDE.md` first, then the
CSS. Colour belongs to the grid. Chrome is a hairline or it is nothing. The
serif is the display voice. Written as constraints with the reason attached,
they held in places I never enumerated.

Then the third turned out to be wrong. I had written that the serif was for the
heading alone, and the CSS I wrote next put it on the running total too. I
revised the rule, not the page — the total really is the second thing the page
is about. A harness the code contradicts is worse than none: it teaches you to
skim the file.

## What it changed

I've been treating checks as a gate to get through. This week they were the
thing that did the diagnosing: `astro check` told me *why* my script couldn't be
tested before I'd worked it out myself, and I had already dismissed the warning
five times as noise.

I want to be the kind of developer who is suspicious of a green check, and who
notices when a passing test is only reporting the shape of an obstacle I decided
not to move.

The colour work extended that further than I expected. I wrote two different
measures of "are these two swatches distinguishable", and both confidently
ranked the pair I could not tell apart as *further* apart than pairs that were
obviously distinct. A number is not evidence just because it is a number. The
version that shipped is the one I validated against a case I already knew the
answer to — and then, having got a metric that worked, I had to stop myself
optimising against it, because the palette that maximises it assigns hot pink
to "sleep". A good measurement tells you when you have gone wrong. It does not
tell you what to do.
