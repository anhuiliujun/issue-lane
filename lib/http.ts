import { NextResponse } from "next/server"

import { getCurrentUser, type CurrentUser } from "@/lib/auth"

export async function apiUser(): Promise<
  { user: CurrentUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }
  }
  return { user, error: null }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}
