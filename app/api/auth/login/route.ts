import { NextResponse } from "next/server"
import { z } from "zod"

import { login } from "@/lib/auth"
import { errorMessage, jsonError } from "@/lib/http"

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("Enter the demo email and password.")
  try {
    const user = await login(parsed.data.email, parsed.data.password)
    if (!user) return jsonError("That email or password does not match the demo account.", 401)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError(errorMessage(error), 500)
  }
}
