# Verification files

Every PR carries `verifications/<pr-number>.md`: a record of how its author (usually an agent) checked that the change works, and of what they didn't check. The **Verification** check fails on a PR marked ready for review whose file is missing or has an empty section. It checks shape only: a file of "None." passes. Whether the evidence is real and enough is the reviewer's call, and with no AI reviewer yet, the reviewer is the only check on quality.

This follows Will Larson's [verification pattern](https://lethain.com/adopting-verification-pattern/). Tests and CI already exist; the point is that the author writes down the steps they actually took, or admits they didn't take them, so the reviewer can see what was proven and what is still a risk.

## The loop

1. **Implement** the change.
2. **Verify it locally**: run the automated checks, then drive the real app against the local stack (see [Recipes](#recipes-by-change-type) and the `verify-locally` skill in `.agents/skills/`). Fix what you find and verify again.
3. **Open a draft PR** (`gh pr create --draft`) to get its number.
4. **Write the file**: `cp verifications/TEMPLATE.md verifications/<pr>.md`, fill it in from what you actually observed, commit, and push. `scripts/check-verification.sh <pr>` runs the same check as CI.
5. **Mark it ready** (`gh pr ready`) and wait for CI to pass. Only then is the PR ready for review.
6. **Review**: the reviewer reads the verification file before the diff and weighs "Not verified" as open risk. The check's run also warns when the PR changes the check itself.
7. **Keep it updated**: if review leads to more commits, verify those too and update the file. The check warns when files changed after the verification file's last update.

Weekly, the reviewer runs `scripts/verification-gaps.sh`, which lists the "Not verified" and "Harness gaps" sections of recent PRs. Repeated gaps, like seed state that's always missing or a flow that's hard to drive, are the backlog for making this repo easier to verify. File an issue for each repeated gap, and fix them with seed data, e2e specs, scripts, or clearer recipes here.

## What good evidence looks like

- **Observe the real thing.** Drive the app the way a member would and read what it shows. Saying it compiled, that the unit tests pass, or that the code "should" work proves nothing about behavior.
- **Show the observation itself.** Paste the snapshot text, the URL you landed on, or the query output. A reviewer should be able to judge the evidence without trusting your summary.
- **Check side effects as well as the screen.** If a vote is cast, query the `votes` row. If an admin action runs, check what changed and that nothing else did.
- **Test the boundaries the change touches**: a non-member (`dave`), a non-admin (`bob`), a meeting in the wrong phase, bad input. Authorization lives in server actions, so a changed action needs a "who can't" check as well as a "who can".
- **Be specific about gaps.** "Didn't test Google sign-in: it doesn't work locally" is useful. "Edge cases not tested" is not.

Weak and strong versions of the same entry:

> ❌ Verified the voting page works.
>
> ✅ As carol (mobile viewport), opened `/meetings/44444444-0000-4000-8000-000000000003` (voting open, Ranked Choice switched off) and pressed **Vote** on _Braiding Sweetgrass_. Its card now shows "Your vote" and a "Remove Vote" button. The votes on that meeting:
>
> ```
> $ npm run db:sql -- -c "select bk.title, u.name from votes v join book_options o on o.id = v.book_option_id join books bk on bk.id = o.book_id join users u on u.id = v.user_id where o.meeting_id = '44444444-0000-4000-8000-000000000003' order by u.name"
>         title        |     name
> ---------------------+--------------
>  The Overstory       | Bob Member
>  Braiding Sweetgrass | Carol Member
> ```
>
> As dave (not in Seed Club), the same URL redirected to `/dashboard`.

> ❌ Not verified: some edge cases.
>
> ✅ Not verified: a tie between two books in the final round. The seed has no tied meeting, and the tie-break is covered only by `packages/core/voting-algorithm.test.ts`.

## Recipes by change type

Use the ones that apply. Mechanics (starting the stack, when to reset it, seed users and meetings, `db:sql`) are in the `verify-locally` skill (`.agents/skills/verify-locally/SKILL.md`).

| Change                                               | Verify by                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI (page, component, copy)                           | `npm run dev:local`, then drive it with Playwright at a mobile viewport. Record what the accessibility snapshot shows, the states the change touches (empty, loading, error), and which seed user and meeting you used.                                                                                                                                                           |
| Server action                                        | Drive it through the UI as an allowed user, and confirm the write with `db:sql`. Then show that a user who must be refused (non-member `dave`, or non-admin `bob` for admin actions) can't do it. A page that hides the button is not enough, because the action is a public endpoint: cover its authorization in a unit test, as `apps/web/app/actions/book-clubs.test.ts` does. |
| Migration or Postgres function                       | `npm run db:reset` succeeds. Query the new schema or call the function with `db:sql`, including a call that should be rejected. Confirm the currently deployed code still works on the new schema: CI's Migration compat job does this, and so does running main's e2e specs locally. Note what the production `apply_migration` step will do.                                    |
| Voting, ranking, or tallying logic                   | Unit tests in `packages/core/*.test.ts` for the algorithm, plus one end-to-end ballot through the UI on the voting-open meeting, and the results view on the finalized meeting.                                                                                                                                                                                                   |
| External API (OverDrive, Open Library, Google Books) | Exercise the live path once, and the failure path: block or mock the call and show the fallback appears instead of an error. `npm run test:integration` covers Open Library.                                                                                                                                                                                                      |
| CI or scripts                                        | Run the script locally on a passing input and on a failing one, and link the CI run that exercised the change.                                                                                                                                                                                                                                                                    |
| Docs only                                            | Say so. Check that the commands and paths you documented exist and run.                                                                                                                                                                                                                                                                                                           |

If you add an e2e spec for the change, say which claim it guards.
