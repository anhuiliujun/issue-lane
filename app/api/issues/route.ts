import { NextResponse } from "next/server"
import { z } from "zod"

import { issueIdentifier } from "@/lib/domain"
import { apiUser, errorMessage, jsonError } from "@/lib/http"
import { createIssue, getTeam, listIssues } from "@/lib/repo"

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000).optional(),
})

export async function GET() {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const issues = await listIssues()
  return NextResponse.json({ issues })
}

export async function POST(request: Request) {
  const auth = await apiUser()
  if (auth.error) return auth.error
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("Give the issue a title.")
  try {
    const created = await createIssue(parsed.data)
    const team = await getTeam()
    return NextResponse.json({
      id: created.id,
      identifier: issueIdentifier(team.key, created.number),
    })
  } catch (error) {
    return jsonError(errorMessage(error), 500)
  }
}
