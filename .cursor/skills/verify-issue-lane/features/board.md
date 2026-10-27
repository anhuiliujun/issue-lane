# Board

The board shows the team's workflow as columns and opens an issue when its identifier is chosen.

## Sub-features

- `board-columns` shows every seeded status and the issues in that status.
- `board-open` opens an issue from its identifier link.

## How to get to it (user POV)

- Sign in. The app lands on `/board`.
- Choose `Issues` in the sidebar.
- Choose `Board` in the issues header.

## Driving it with the Cursor browser

Preconditions:

- Doctor reports `doctor=ok`.
- Signed in as `demo@issue-lane.app`. If the sign-in screen is showing, follow [Sign in](./sign-in.md) through `sign-in-demo` first.
- Seed data is intact. `LANE-6` is titled `Split account setup into three steps` and is in Triage. Confirm with `verify-issue-lane sql -c "SELECT number, title FROM issues WHERE number = 6"`.

- **Sidebar entry.** From a signed-in page, choose `Issues`. Run `browser_click` the link named `Issues`. The URL is `http://127.0.0.1:4173/board` and the heading reads `Issues`.
- **Header entry.** Choose `Board` if another issues view is showing. Run `browser_click` the link named `Board`. The link is current and the column headings are visible.
- **Columns.** Read the board. Snapshot the page. Headings `Triage`, `Backlog`, `Todo`, `In Progress`, `Done`, and `Canceled` are all present. Triage contains link `LANE-6`. Done contains link `LANE-1`. Canceled contains link `LANE-5`.
- **Open an issue.** Choose `LANE-6`. Run `browser_click` the link named `LANE-6`. The URL is `http://127.0.0.1:4173/issues/LANE-6` and the heading reads `Split account setup into three steps`.
- **Proof.** Capture the issue page. Save the snapshot as `issue.aria.txt` and the screenshot as `issue.png` under `verify-issue-lane evidence board`. Both show `LANE-6` and the title. The SQL row for number 6 still has that title.

## Gotchas

- Dragging a card between columns also changes status. This journey does not drag. Status changes are proved from the list.
- The identifier link is the control that opens the issue. Clicking the card body only selects it for the command menu.
- Column headings are the status names. A colored dot without the heading is not enough.
- `LANE-8` is a sub-issue of `LANE-2` and appears on the board in Todo. Do not treat it as missing from the list of top-level work.
