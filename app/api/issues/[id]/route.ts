import { NextResponse } from "next/server"
import { z } from "zod"

import { priorities } from "@/lib/domain"
import { apiUser, errorMessage, jsonError } from "@/lib/http"
import { getIssueDetail, updateIssue } from "@/lib/repo"

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20_000).optional(),
  statusId: z.uuid().optional(),
  priority: z.enum(priorities).optional(),
  assigneeId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  labelIds: z.array(z.uuid()).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Nothing to change." })

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  const issue = await getIssueDetail(id)
  if (!issue) return jsonError("Issue not found.", 404)
  return NextResponse.json({ issue })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const { id } = await context.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Could not update the issue.")
  try {
    const issue = await updateIssue(id, parsed.data)
    if (!issue) return jsonError("Issue not found.", 404)
    return NextResponse.json({ issue })
  } catch (error) {
    return jsonError(errorMessage(error), 400)
  }
}
