# Sign in

Sign in lets the demo user open the board with the prefilled account, rejects a wrong password, and return to the sign-in screen from Sign out.

## Sub-features

- `sign-in-demo` enters the board with the prefilled demo account.
- `sign-in-reject` shows an error for a password that does not match.
- `sign-out` returns to the sign-in screen.

## How to get to it (user POV)

- Open `http://127.0.0.1:4173/login`.
- Open `http://127.0.0.1:4173/`, which redirects to `/login` when signed out and to `/board` when signed in.
- Choose `Sign out` at the bottom of the sidebar after signing in.

## Driving it with the Cursor browser

Preconditions:

- Doctor reports `url=http://127.0.0.1:4173` and `doctor=ok`.
- The browser has no `lane_session` cookie for `127.0.0.1`. Start from a fresh tab if a previous drive signed in.

- **Open sign-in.** Go to the login URL. Run `browser_navigate` with url `http://127.0.0.1:4173/login`. The heading reads `Issue Lane`, textbox `Email` is `demo@issue-lane.app`, textbox `Password` is filled, and button `Sign in` is visible.
- **Reject a bad password.** Replace the password and submit. Run `browser_fill` on the `Password` textbox with value `wrong-password`, then `browser_click` the `Sign in` button. The page stays on `/login` and shows `That email or password does not match the demo account.`
- **Sign in.** Restore the demo password and submit. Run `browser_fill` on `Password` with value `lane-demo`, then `browser_click` `Sign in`. The URL is `http://127.0.0.1:4173/board`, the heading reads `Issues`, and the sidebar shows `Lane` and `Sign out`.
- **Sign out.** Choose `Sign out`. Run `browser_click` the button named `Sign out`. The sign-in heading `Issue Lane` returns.
- **Proof.** Capture the board before signing out. Run `browser_snapshot` and `browser_take_screenshot`, and copy them to the directory from `verify-issue-lane evidence sign-in` as `board.aria.txt` and `board.png`. Both show team `Lane` and heading `Issues`.

## Gotchas

- The password field is prefilled with `lane-demo`. A reject check has to replace that value first.
- `/` redirects before the board renders. Assert the final URL, not the first navigation request.
- An existing `lane_session` cookie skips the form and opens the board. That does not prove sign-in.
- Wrong-password copy is the assertion. A generic browser error is not the product error.
