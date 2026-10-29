import { createHash } from "node:crypto"

import { sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { isUserKind, type UserKind } from "@/lib/domain"

export type CurrentUser = {
  id: string
  name: string
  email: string | null
  kind: UserKind
  workspaceId: string
}

export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function findUserBySessionToken(token: string): Promise<CurrentUser | null> {
  const row = await db.query.authSessions.findFirst({
    where: (table, { and, eq: equals, gt: later }) =>
      and(equals(table.tokenHash, hashToken(token)), later(table.expiresAt, sql`now()`)),
    with: { user: true },
  })
  if (!row?.user || !isUserKind(row.user.kind)) return null
  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    kind: row.user.kind,
    workspaceId: row.user.workspaceId,
  }
}
