import { NextResponse } from "next/server"
import { z } from "zod"

import { apiUser, errorMessage, jsonError } from "@/lib/http"
import { addComment } from "@/lib/repo"

const bodySchema = z.object({
  body: z.string().trim().min(1).max(10_000),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("Write a comment first.")
  try {
    const comment = await addComment(id, auth.user.id, parsed.data.body)
    if (!comment) return jsonError("Issue not found.", 404)
    return NextResponse.json({ id: comment.id })
  } catch (error) {
    return jsonError(errorMessage(error), 400)
  }
}
