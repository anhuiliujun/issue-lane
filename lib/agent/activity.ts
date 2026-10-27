import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { agentActivities, agentSessions } from "@/lib/db/schema"
import {
  isActivityType,
  stateForActivity,
  type ActivityType,
} from "@/lib/domain"

const openRuns = new Set<string>()

export function claimRun(sessionId: string) {
  if (openRuns.has(sessionId)) return false
  openRuns.add(sessionId)
  return true
}

export function releaseRun(sessionId: string) {
  openRuns.delete(sessionId)
}

export async function recordActivity(input: {
  sessionId: string
  type: ActivityType
  body?: string
  actionName?: string | null
  actionParams?: Record<string, unknown> | null
  actionResult?: Record<string, unknown> | null
}) {
  const state = stateForActivity(input.type)
  const [activity] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(agentActivities).values({
      sessionId: input.sessionId,
      type: input.type,
      body: input.body ?? "",
      actionName: input.actionName ?? null,
      actionParams: input.actionParams ?? null,
      actionResult: input.actionResult ?? null,
    }).returning()
    await tx.update(agentSessions).set({
      state,
      updatedAt: new Date(),
    }).where(eq(agentSessions.id, input.sessionId))
    return [created]
  })
  return activity
}

export async function listActivities(sessionId: string) {
  const rows = await db.query.agentActivities.findMany({
    where: eq(agentActivities.sessionId, sessionId),
    orderBy: asc(agentActivities.createdAt),
  })
  return rows.flatMap((row) => {
    if (!isActivityType(row.type)) return []
    return [{ ...row, type: row.type }]
  })
}
