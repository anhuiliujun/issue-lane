import { NextResponse } from "next/server"

import { retrySession } from "@/lib/agent/run"
import { apiUser, errorMessage, jsonError } from "@/lib/http"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  try {
    const session = await retrySession(id)
    if (!session) return jsonError("Session not found.", 404)
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(errorMessage(error), 400)
  }
}