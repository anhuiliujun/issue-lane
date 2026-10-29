# Create an issue

Create an issue lets a signed-in user add a title and description from the command menu, then see that issue on its own page and on the board.

## Sub-features

- `create-open` opens the new-issue dialog from the command menu.
- `create-save` stores the title and description and opens the new issue.
- `create-visible` shows the new issue in Triage on the board.

## How to get to it (user POV)

- Press Ctrl K or ⌘K, then choose `New issue`.

## Driving it with the Cursor browser

Preconditions:

- Doctor reports `doctor=ok`.
- Signed in on `http://127.0.0.1:4173/board`.
- No issue is titled `Verify lane checklist`. Confirm with `verify-issue-lane sql -c "SELECT count(*) FROM issues WHERE title = 'Verify lane checklist'"`. The count is `0`.

- **Open the menu.** Press Ctrl K or ⌘K. Run `browser_cdp` method `Runtime.evaluate` with expression `window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))`. A combobox named `Type a command…` appears with the option `New issue`. If it does not, repeat the expression with `ctrlKey: true` instead of `metaKey: true`.
- **Open the dialog.** Choose `New issue`. Run `browser_click` the option named `New issue`. A heading `New issue` appears, with text `It starts in Triage.`, a textbox named `Issue title`, and a button `Create issue`.
- **Enter the issue.** Fill the title and description. Run `browser_fill` on the `Issue title` textbox with value `Verify lane checklist`, then `browser_fill` on the `Description, in Markdown` textbox with value `Created from the command menu`. The `Create issue` button is enabled.
- **Create.** Choose `Create issue`. Run `browser_click` the button named `Create issue`. The button reads `Creating…`, then the URL matches `/issues/LANE-`, the heading reads `Verify lane checklist`, and the description text `Created from the command menu` is on the page.
- **Confirm on the board.** Choose `Board` in the sidebar. Run `browser_click` the link named `Board`. The URL is `http://127.0.0.1:4173/board`. Under the `Triage` heading there is a link for the new identifier and the title `Verify lane checklist`.
- **Confirm the row.** Read the stored issue. Run `verify-issue-lane sql -c "SELECT number, title, description FROM issues WHERE title = 'Verify lane checklist'"`. One row has that title and description.
- **Proof.** Save the issue-page snapshot as `issue.aria.txt`, the screenshot as `issue.png`, and the SQL output as `row.txt` under `verify-issue-lane evidence create-issue`. Write `entry=command-menu` in `notes.txt`.

## Gotchas

- There is no New issue button in the header. The command menu is the only entry. Opening the issue page some other way does not verify this feature.
- The heading `Command menu` is present while the menu is closed. Treat the combobox `Type a command…` as the open menu.
- Filling the description box by accident leaves `Create issue` disabled because the title is empty.
- The issue URL can lag the dialog closing. Wait until the address matches `/issues/LANE-` before reading the heading.
- Titles are trimmed. Assert the heading, not a trailing space left in the field.
- The new identifier is the next number after the seed, `LANE-9`, only when the seed is untouched. Assert the title and a `LANE-` URL, then read the number from SQL.
- A dialog that closes without the issue page, or a toast `Could not create the issue.`, is a failure. Do not insert the row with SQL to continue.
