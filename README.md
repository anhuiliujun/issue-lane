# Issue Lane

A single-team issue board. Statuses are rows on the team's workflow, not a fixed enum.

## Demo login

- Email: `demo@issue-lane.app`
- Password: `lane-demo`

The login form is filled in. There is no registration.

## Run locally

Postgres needs a database named `issue_lane` owned by the `issue_lane` user, password `issue_lane`, on `127.0.0.1:5432`. Copy `.env.example` to `.env.local` if you use a different URL.

```bash
pnpm install
pnpm db:setup
pnpm dev
```

Open http://localhost:3000 and sign in. The sidebar opens the board, the list, and projects. Board and list show the same issues. Drag a card to another column to change its status, or change status from the list row. Open an issue to edit its title, description, status, priority, assignee, labels, and project, and to write a comment.

Press C to create an issue. Ctrl K or ⌘K opens the command menu for a new issue, or to change status and assignee on the selected issue. Filters for status, assignee, project, and priority stay in the address bar, so the board and the list share them.

Agent tables remain in the database. This interface does not start a triage session.

Push test ran.
