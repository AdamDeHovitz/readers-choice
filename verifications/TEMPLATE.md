# Verification: <!-- PR title -->

<!--
Copy to verifications/<pr-number>.md. Comments like this one are stripped by
scripts/check-verification.sh, so a section with only comments counts as empty.
Standards and recipes: verifications/README.md.
-->

## Change

<!-- One or two sentences: what changed, and what should now be true that wasn't before (for a member, an admin, or an operator). -->

## Checks

<!--
Automated checks you ran, the exact command, and the result. For example:
- `npm run lint`: clean
- `npm run typecheck`: clean
- `npm run test:run`: 212 passed
- `npm run build` (dummy env): succeeded
- `npm run test:e2e`: 9 passed
-->

## Behavior

<!--
One entry per claim from "Change", as a bullet or a "###" heading (a "##"
heading would start a new section). For each: what you did (who you logged in
as, which seeded meeting or club, what you clicked or called), what you
observed (accessibility snapshot text, URL, `db:sql` output), and whether it
passed. Paste the observation; don't paraphrase it. Cover the failure paths
the change touches (non-member, wrong phase, bad input), not just the happy path.
-->

## Not verified

<!-- What you didn't or couldn't verify, and why. Each item is a risk the reviewer now owns. Write "None." only if that's true. -->

## Harness gaps

<!-- What made verifying harder than it should have been: missing seed state, a tool that failed, an undocumented step. Write "None." if nothing did. -->
