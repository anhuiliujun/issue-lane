# Issue Lane verification map

This directory is the maintained source for verifying the user-facing behavior of Issue Lane. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-issue-lane/scripts/verify-issue-lane launch`.
- The app is `http://127.0.0.1:4173`. The database is `issue_lane_verify` on `127.0.0.1:54329`.
- Doctor prints `doctor=ok` before any browser action.
- Seeded sign-in is `demo@issue-lane.app` / `lane-demo`. The form is prefilled.
- Seeded issues are `LANE-1` through `LANE-8`. `LANE-6` is in Triage and titled `Split account setup into three steps`.
- Never drive an Issue Lane process this verification run did not start. Never point the helper at database `issue_lane` on port 5432.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or screen coordinates.
- The new-issue fields are named `Issue title` and `Description, in Markdown`. Those names come from the placeholders.
- Open the command menu with the Ctrl K / ⌘K chord documented in the skill. There is no menu button.
- Run browser actions through the Cursor browser tools named in the skill.
- Read stored rows with `verify-issue-lane sql`.
- Leave proof files in `/tmp/issue-lane-verify-evidence`. Cleanup does not remove them.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an accessibility snapshot and a screenshot with `Issue Lane` or team `Lane` visible.
- Mutation proof includes a second user-facing view and a SQL row from `issue_lane_verify`.
- Record the feature id and entry point used with every artifact.
- Report an unreachable path with the attempted action and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with the Cursor browser` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Sign in](./sign-in.md) covers the prefilled demo sign-in, a rejected password, and sign-out.
- [Board](./board.md) covers the seeded columns and opening an issue from its identifier.
- [Create an issue](./create-issue.md) covers the command menu, creating an issue, and seeing it on the board.
- [Change status from the list](./list-status.md) covers moving one issue from its row menu.
- [Projects](./projects.md) covers opening the seeded project from the sidebar.
