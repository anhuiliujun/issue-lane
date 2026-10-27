# Projects

Projects shows the team's project and opens it from the list.

## Sub-features

- `projects-list` shows the seeded project.
- `projects-open` opens that project from its name.

## How to get to it (user POV)

- Choose `Projects` in the sidebar.

## Driving it with the Cursor browser

Preconditions:

- Doctor reports `doctor=ok`.
- Signed in as `demo@issue-lane.app`.
- The seed contains one project named `Interview slice`. Confirm with `verify-issue-lane sql -c "SELECT name, status FROM projects"`.

- **Open projects.** Choose `Projects`. Run `browser_click` the link named `Projects`. The URL is `http://127.0.0.1:4173/projects`, the heading reads `Projects`, and a link named `Interview slice` is visible with status `started`.
- **Open the project.** Choose `Interview slice`. Run `browser_click` the link named `Interview slice`. The URL starts with `http://127.0.0.1:4173/projects/` and the page shows `Interview slice`.
- **Proof.** Save the project snapshot as `project.aria.txt` and the screenshot as `project.png` under `verify-issue-lane evidence projects`. The SQL row still has name `Interview slice` and status `started`.

## Gotchas

- The project URL uses the project id, not a slug. Assert the name on the page and the `/projects/` prefix, then match the id from the address to the SQL id if the id matters.
- `Issues` stays available in the sidebar. Landing on the board instead means the Projects link was not the control that was clicked.
