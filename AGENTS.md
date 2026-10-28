<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cloud Agent environment

PostgreSQL 16 listens on `127.0.0.1:5432`. Database `issue_lane` is owned by role `issue_lane` with password `issue_lane`. If `.env.local` is missing, copy `.env.example`.

Boot migrates that database and runs `pnpm db:seed` only when `demo@issue-lane.app` is absent. `pnpm db:setup` truncates and reseeds. The dev server is already `next dev` on port 3000. Sign in as `demo@issue-lane.app` / `lane-demo`.

`initdb` and `pg_ctl` are on `PATH` for `.cursor/skills/verify-issue-lane`. That helper uses its own cluster on port 54329 and the app on port 4173, and it does not use the database on port 5432.
