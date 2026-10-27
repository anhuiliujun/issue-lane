"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/domain"

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3 rounded-lg border bg-card p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        setError(null)
        const data = new FormData(event.currentTarget)
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          setPending(false)
          setError(payload.error ?? "Could not sign in.")
          return
        }
        router.push("/board")
        router.refresh()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={DEMO_EMAIL} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" defaultValue={DEMO_PASSWORD} required />
      </div>
      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="text-[12px] text-muted-foreground">
        Demo account {DEMO_EMAIL} / {DEMO_PASSWORD}. There is no registration.
      </p>
    </form>
  )
}
