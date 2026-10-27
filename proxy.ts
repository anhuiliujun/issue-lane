import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { SESSION_COOKIE } from "@/lib/domain"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const loggedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    if (!loggedIn) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (loggedIn) return NextResponse.redirect(new URL("/board", request.url))
    return NextResponse.next()
  }

  if (!loggedIn) {
    const login = new URL("/login", request.url)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
