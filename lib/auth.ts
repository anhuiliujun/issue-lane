import { randomBytes } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

import { findUserBySessionToken, hashToken, sessionCookie, type CurrentUser } from "@/lib/auth-session"
import { db } from "@/lib/db"
import { authSessions, users } from "@/lib/db/schema"
import { isUserKind, SESSION_COOKIE } from "@/lib/domain"
import { verifyPassword } from "@/lib/password"

export type { CurrentUser }

const SESSION_DAYS = 14

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return findUserBySessionToken(token)
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
    ...sessionCookie,
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
