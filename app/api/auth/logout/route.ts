import { NextResponse } from "next/server"

import { logout } from "@/lib/auth"
import { errorMessage, jsonError } from "@/lib/http"

export async function POST() {
  try {
    await logout()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonError(errorMessage(error), 500)
  }
}
