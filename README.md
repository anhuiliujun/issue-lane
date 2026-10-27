# Issue Lane

A single-team issue board with a triage agent. Statuses are rows on the team's workflow, not a fixed enum.

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

Open http://localhost:3000 and sign in. The board and list are seeded. `LANE-6` has a clear triage goal. `LANE-7` is vague: assign Triage, answer the question, and the session should set a priority, leave Triage, create sub-issues, and complete.

Ctrl K or ⌘K opens the command menu: new issue, change status, change assignee. Select an issue on the board or list before the last two. Dragging a card to another column changes its status. The list can change status from the row.

## Model

Triage calls Vercel AI Gateway with `deepseek/deepseek-v4.1-flash`. If that request fails, the gateway tries `moonshotai/kimi-k2`.

The board does not need a model key. With no `AI_GATEWAY_API_KEY` and no `VERCEL_OIDC_TOKEN`, triage still runs and the first thought says it is using scripted rules. On Vercel, the injected `VERCEL_OIDC_TOKEN` is enough. Locally, `vercel link` and `vercel env pull`, or set `AI_GATEWAY_API_KEY`.

A thought is written when the session is created, before the model or scripted turn, so it lands inside the 10 second window. If a session is still pending with no thought after 10 seconds, the issue page says it hasn't started and offers retry.
