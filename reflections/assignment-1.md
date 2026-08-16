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

## What it changed

I've been treating checks as a gate to get through. This week they were the
thing that did the diagnosing: `astro check` told me *why* my script couldn't be
tested before I'd worked it out myself, and I had already dismissed the warning
five times as noise.

I want to be the kind of developer who is suspicious of a green check, and who
notices when a passing test is only reporting the shape of an obstacle I decided
not to move.
