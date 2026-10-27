import { createHash, randomBytes } from "node:crypto"

import { eq, sql } from "drizzle-orm"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { authSessions, users } from "@/lib/db/schema"
import { isUserKind, SESSION_COOKIE, type UserKind } from "@/lib/domain"
import { verifyPassword } from "@/lib/password"

const SESSION_DAYS = 14

export type CurrentUser = {
  id: string
  name: string
  email: string | null
  kind: UserKind
  workspaceId: string
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
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

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })
  if (!user?.passwordHash) return null
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid || !isUserKind(user.kind)) return null

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.insert(authSessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
  return user
}

export async function logout() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)))
  }
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Sign in required.")
  }
  return user
}
