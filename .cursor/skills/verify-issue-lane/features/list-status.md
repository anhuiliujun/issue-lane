# Change status from the list

The list lets a signed-in user change one issue's status from the menu on its row, and the board shows that issue in the new column.

## Sub-features

- `list-open` shows the seeded issues in one table.
- `list-move` moves `LANE-4` from Backlog to Todo.
- `list-board` shows `LANE-4` in the Todo column.

## How to get to it (user POV)

- Choose `List` in the issues header.
- On a list row, choose the status button, then choose the new status.

## Driving it with the Cursor browser

Preconditions:

- Doctor reports `doctor=ok`.
- Signed in as `demo@issue-lane.app`.
- `LANE-4` is titled `Remember board scroll position` and is in Backlog. Confirm with `verify-issue-lane sql -c "SELECT i.number, s.name FROM issues i JOIN workflow_statuses s ON s.id = i.status_id WHERE i.number = 4"`. The status name is `Backlog`.

- **Open the list.** Choose `List`. Run `browser_click` the link named `List`. The URL is `http://127.0.0.1:4173/list`. The table contains link `LANE-4` and a button named `Backlog` on that row.
- **Open the status menu.** Choose the `Backlog` button on the `LANE-4` row, not a `Backlog` button on another row. Run `browser_click` that button. A menu lists `Triage`, `Backlog`, `Todo`, `In Progress`, `Done`, and `Canceled`.
- **Move to Todo.** Choose `Todo`. Run `browser_click` the menu item named `Todo`. The `LANE-4` row now shows a button named `Todo`.
- **Confirm the row.** Read the stored status. Run the same SQL as the precondition. The status name is `Todo`.
- **Confirm on the board.** Choose `Board`. Run `browser_click` the link named `Board`. Link `LANE-4` is under the `Todo` heading and is not under `Backlog`.
- **Proof.** Save the list snapshot after the move as `list.aria.txt`, the screenshot as `list.png`, and the SQL output as `row.txt` under `verify-issue-lane evidence list-status`.

## Gotchas

- Several rows share a status name. The click has to be the button in the row that contains link `LANE-4`.
- Choosing the row itself selects the issue. It does not open the status menu. The status button does.
- Command-menu `Change status` is a different entry point and is not this journey. The issue must be selected first, and this file does not cover it.
- This journey changes seed data in the verification database. The next `launch` reseeds it. Do not repair the status with SQL during the journey.
