import { NextResponse } from "next/server"

import { apiUser, jsonError } from "@/lib/http"
import { getSession } from "@/lib/repo"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  const session = await getSession(id)
  if (!session) return jsonError("Session not found.", 404)
  return NextResponse.json({ session })
}
