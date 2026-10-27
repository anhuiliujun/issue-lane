---
name: verify-issue-lane
description: "Drive the Issue Lane web app the way a signed-in user does and prove board, list, project, and issue behavior. Use when verifying UI changes, reproducing a board or issue bug, or proving a user-facing change in this repo."
---

# Verify Issue Lane

Issue Lane is a Next.js issue board at a browser URL. The primary surface is the signed-in web UI (board, list, issue page, projects, command menu). There is no CLI product. HTTP exists only as the app's own API, which the pages call after sign-in.

Verification uses its own Postgres cluster and its own Next.js process. It does not connect to the developer database `issue_lane` on port 5432, and it does not start the system PostgreSQL service. On this machine that service (`postgresql-17`) may be disabled; leave it alone.

Only one verification instance can run. It owns ports 4173 (app) and 54329 (database). A second launch must refuse. Do not drive a dev server you did not start.

## Launch

From the repo root:

```bash
.cursor/skills/verify-issue-lane/scripts/verify-issue-lane launch
```

Launch creates `/tmp/issue-lane-verify-run/pgdata` with `initdb`, starts Postgres on `127.0.0.1:54329` as user `issue_lane`, creates database `issue_lane_verify`, runs `pnpm exec drizzle-kit migrate` and `pnpm exec tsx scripts/seed.ts` against that database only, then starts `pnpm exec next dev --port 4173 --hostname 127.0.0.1`. If `node_modules/.bin/next` is missing, launch runs `pnpm install` first.

The database URL is fixed:

`postgresql://issue_lane:issue_lane@127.0.0.1:54329/issue_lane_verify`

Ready means all of these are true:

- `pg_isready` accepts connections on `127.0.0.1:54329`.
- `current_database()` is `issue_lane_verify`.
- `users` contains `demo@issue-lane.app`.
- `issues` contains 8 seeded rows.
- `http://127.0.0.1:4173/login` returns the Issue Lane sign-in page, including the text `Sign in`.

Launch prints the doctor lines when that state is reached. Seeded sign-in is email `demo@issue-lane.app`, password `lane-demo`. The login form is prefilled. There is no registration.

Teardown is `cleanup` below. Launch again only after cleanup. Launch truncates and reseeds `issue_lane_verify`; it never truncates `issue_lane`.

## Doctor

Run this first whenever the page, the port, or the data looks wrong:

```bash
.cursor/skills/verify-issue-lane/scripts/verify-issue-lane doctor
```

Doctor is read-only. It passes only when:

- the recorded app pid is alive
- port 4173 is listened on by that pid or a child of it
- Postgres on port 54329 reports database `issue_lane_verify`
- the demo user row exists
- `/login` is the Issue Lane sign-in page
- unsigned `GET /api/issues` returns HTTP 401 and `Sign in required.`

A passing doctor prints `url=http://127.0.0.1:4173`, `database=issue_lane_verify`, `pg_port=54329`, `app_pid=...`, `demo_user=demo@issue-lane.app`, and `doctor=ok`. If doctor fails, do not click through the app. Run cleanup, then launch, then doctor again.

## Drive

Drive the browser at `http://127.0.0.1:4173` with the Cursor browser tools. Prefer the accessibility snapshot. Click and fill by the snapshot ref whose role and name match the feature file. Do not click by coordinates.

1. `browser_tabs` action `list`. Reuse a tab only if its URL is already `http://127.0.0.1:4173`. Otherwise `browser_navigate` to that origin. Omit `position` so the window stays in the background.
2. `browser_lock` action `lock` before the first click, and `unlock` when the drive is finished.
3. `browser_snapshot` before every structural action. Act on one ref. Snapshot again.
4. `browser_fill` for text fields. `browser_click` for buttons and links. `browser_press_key` for a single key such as `Enter` or `Escape`.
5. The command menu has no button. The page listens for Ctrl K or ⌘K. `browser_press_key` cannot hold a modifier, so open it with `browser_cdp` method `Runtime.evaluate` and this expression:

```js
window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
```

If the dialog named `Command menu` does not appear, repeat with `ctrlKey: true` instead of `metaKey: true`.

Stable handles:

- Sign-in: heading `Issue Lane`, textbox `Email`, textbox `Password`, button `Sign in`.
- Shell: link `Issues`, link `Projects`, button `Sign out`, team name `Lane`.
- Issues header: heading `Issues`, link `Board`, link `List`.
- Board columns are headings: `Triage`, `Backlog`, `Todo`, `In Progress`, `Done`, `Canceled`. Issue identifiers are links such as `LANE-6`.
- Command menu, when open: combobox `Type a command…`, option `New issue`, option `Change status Select an issue`, option `Change assignee Select an issue` (the status and assignee names include `Select an issue` until an issue is selected). The heading `Command menu` stays in the tree while the menu is closed, so the combobox is the sign it is open.
- New issue dialog: heading `New issue`, textbox `Issue title`, textbox `Description, in Markdown`, button `Create issue`, button `Close`. The button name is `Creating…` while the request is in flight. The issue URL arrives after the dialog closes.
- A board card is a button whose name includes the priority, identifier, and title, plus a separate link named with the identifier. The issue page has no `Board` link. Choose `Issues` in the sidebar to return to the board.
- List status controls are buttons whose name is the status, inside the row that contains that issue's identifier link.
- Projects: heading `Projects`, link `Interview slice`.

Read `.cursor/skills/verify-issue-lane/features/README.md` before choosing a journey, then follow that feature file. A proof that uses one entry point does not cover an entry point the map lists separately.

Side effects are read with the helper, not by guessing:

```bash
.cursor/skills/verify-issue-lane/scripts/verify-issue-lane sql -c "SELECT number, title FROM issues ORDER BY number"
```

## Evidence

Save proof under `/tmp/issue-lane-verify-evidence/<feature-id>/`. Create the directory with:

```bash
.cursor/skills/verify-issue-lane/scripts/verify-issue-lane evidence <feature-id>
```

For each journey, keep:

- an accessibility snapshot taken after the user action, while the resulting state is on screen
- a screenshot of that same state, with `Issue Lane` or the team name `Lane` visible
- the command output that shows the stored side effect, when the action writes data

Name files for the step, for example `issue.aria.txt`, `issue.png`, and `row.txt`. Copy the snapshot text and the screenshot file into that directory before cleanup. Record the feature id and the entry point in `notes.txt`.

Proof standards:

- Use the signed-in pages. Do not insert rows with SQL or call `POST /api/issues` as a substitute for the command menu.
- Capture the action and the resulting screen, then a second view of the same result (board or list link, and the SQL row).
- The login page and the board do not need `AI_GATEWAY_API_KEY`. Triage model output is out of scope for these journeys. Do not treat a scripted thought as proof of the model.
- Cleanup must not delete `/tmp/issue-lane-verify-evidence`.

## Cleanup

```bash
.cursor/skills/verify-issue-lane/scripts/verify-issue-lane cleanup
```

Cleanup kills the pid recorded in `/tmp/issue-lane-verify-run/app.pid` and its children, then stops the Postgres cluster in `/tmp/issue-lane-verify-run/pgdata` with `pg_ctl stop`. It deletes `/tmp/issue-lane-verify-run` only. It does not kill processes by name, does not touch port 5432, and does not delete evidence.

Run cleanup after a failed launch too, so a half-started database or Next.js process is not left behind. Then confirm the evidence files are still present.

## Helpers

The helper is `.cursor/skills/verify-issue-lane/scripts/verify-issue-lane`. It must be executable. Commands: `launch`, `doctor`, `sql`, `evidence`, `cleanup`. `sql` forwards extra arguments to `psql` against `issue_lane_verify` on port 54329. `evidence <feature-id>` prints the evidence directory and creates it.
