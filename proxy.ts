import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { findUserBySessionToken, sessionCookie } from "@/lib/auth-session"
import { SESSION_COOKIE } from "@/lib/domain"

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 })
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const loggedIn = token ? Boolean(await findUserBySessionToken(token)) : false

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    if (!loggedIn) {
      const response = NextResponse.json({ error: "Sign in required." }, { status: 401 })
      if (token) clearSession(response)
      return response
    }
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (loggedIn) return NextResponse.redirect(new URL("/board", request.url))
    const response = NextResponse.next()
    if (token) clearSession(response)
    return response
  }

  if (!loggedIn) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    if (token) clearSession(response)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
