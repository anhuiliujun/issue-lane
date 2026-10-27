import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://issue_lane:issue_lane@127.0.0.1:5432/issue_lane"

const globalForDb = globalThis as unknown as { issueLanePg?: ReturnType<typeof postgres> }

export const client = globalForDb.issueLanePg ?? postgres(databaseUrl, { max: 10 })

if (process.env.NODE_ENV !== "production") {
  globalForDb.issueLanePg = client
}

export const db = drizzle(client, { schema })
