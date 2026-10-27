import { NextResponse } from "next/server"
import { z } from "zod"

import { replyToSession } from "@/lib/agent/run"
import { apiUser, errorMessage, jsonError } from "@/lib/http"

const bodySchema = z.object({
  body: z.string().trim().min(1).max(4_000),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("Write an answer first.")
  try {
    const session = await replyToSession(id, parsed.data.body)
    if (!session) return jsonError("Session not found.", 404)
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(errorMessage(error), 400)
  }
}
