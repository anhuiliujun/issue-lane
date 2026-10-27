import { NextResponse } from "next/server"
import { z } from "zod"

import { delegateIssue, replyToSession } from "@/lib/agent/run"
import { mentionsAgent } from "@/lib/domain"
import { apiUser, errorMessage, jsonError } from "@/lib/http"
import { addComment, findOpenSession, getAgent, updateIssue } from "@/lib/repo"

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
    const agent = await getAgent()
    let sessionId: string | null = null
    if (mentionsAgent(parsed.data.body, agent.name)) {
      const open = await findOpenSession(id)
      if (open?.state === "awaitingInput") {
        const session = await replyToSession(open.id, parsed.data.body)
        sessionId = session?.id ?? null
      } else if (!open) {
        await updateIssue(id, { assigneeId: agent.id })
        const session = await delegateIssue(id)
        sessionId = session?.id ?? null
      }
    }
    return NextResponse.json({ id: comment.id, sessionId })
  } catch (error) {
    return jsonError(errorMessage(error), 400)
  }
}
