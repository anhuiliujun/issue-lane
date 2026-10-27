"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sessionStateLabel } from "@/lib/domain"
import type { ActivityDto, SessionDto } from "@/lib/dto"

export function AgentPanel({
  session,
  onSession,
}: {
  session: SessionDto | null
  onSession: (session: SessionDto) => void
}) {
  const now = useNow()
  const [answer, setAnswer] = useState("")
  const [pending, setPending] = useState(false)

  const sessionId = session?.id
  const sessionState = session?.state

  useEffect(() => {
    if (!sessionId) return
    if (sessionState !== "pending" && sessionState !== "active") return
    let cancelled = false
    async function poll() {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok || cancelled) return
      const payload = await response.json()
      if (payload.session && !cancelled) onSession(payload.session)
    }
    const id = window.setInterval(() => {
      void poll()
    }, 800)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [sessionId, sessionState, onSession])

  if (!session) {
    return (
      <section className="rounded-md border bg-card px-3 py-3">
        <h2 className="font-medium">Triage</h2>
        <p className="mt-1 text-muted-foreground">
          Assign Triage, or mention @Triage in a comment, to open a session.
        </p>
      </section>
    )
  }

  const hasThought = session.activities.some((activity) => activity.type === "thought")
  const age = now - new Date(session.createdAt).getTime()
  const notStarted = now > 0 && !hasThought && age > 10_000
  const question = [...session.activities].reverse().find((activity) => activity.type === "elicitation")

  return (
    <section className="rounded-md border bg-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Triage</h2>
        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
          {sessionStateLabel[session.state]}
        </span>
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {session.activities.map((activity) => (
          <li key={activity.id} className="border-l-2 border-border pl-2">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{labelFor(activity)}</p>
            <p className={activity.type === "thought" ? "text-muted-foreground" : ""}>{textFor(activity)}</p>
          </li>
        ))}
      </ol>
      {notStarted ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p>Hasn&apos;t started.</p>
          <Button size="sm" variant="outline" onClick={() => void retry(session.id, onSession)}>Retry</Button>
        </div>
      ) : null}
      {session.state === "error" ? (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => void retry(session.id, onSession)}>Retry</Button>
        </div>
      ) : null}
      {session.state === "awaitingInput" && question ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)
            const response = await fetch(`/api/sessions/${session.id}/reply`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ body: answer }),
            })
            const payload = await response.json().catch(() => ({}))
            setPending(false)
            if (!response.ok) {
              toast.error(payload.error ?? "Could not send the answer.")
              return
            }
            setAnswer("")
            onSession(payload.session)
          }}
        >
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Answer the question"
            rows={3}
            required
          />
          <Button type="submit" size="sm" disabled={pending || answer.trim().length === 0} className="self-start">
            {pending ? "Sending…" : "Send answer"}
          </Button>
        </form>
      ) : null}
    </section>
  )
}

let nowSnapshot = 0

function subscribeNow(onStoreChange: () => void) {
  nowSnapshot = Date.now()
  const id = window.setInterval(() => {
    nowSnapshot = Date.now()
    onStoreChange()
  }, 1000)
  return () => window.clearInterval(id)
}

function getNow() {
  return nowSnapshot
}

function getServerNow() {
  return 0
}

function useNow() {
  return useSyncExternalStore(subscribeNow, getNow, getServerNow)
}

function labelFor(activity: ActivityDto) {
  switch (activity.type) {
    case "thought":
      return "Thought"
    case "action":
      return activity.actionName ?? "Action"
    case "elicitation":
      return "Question"
    case "response":
      return "Response"
    case "error":
      return "Error"
    case "prompt":
      return "You"
    default: {
      const unreachable: never = activity.type
      return unreachable
    }
  }
}

function textFor(activity: ActivityDto) {
  if (activity.type === "action") {
    const summary = activity.actionResult?.summary
    if (typeof summary === "string") return summary
  }
  return activity.body
}

async function retry(sessionId: string, onSession: (session: SessionDto) => void) {
  const response = await fetch(`/api/sessions/${sessionId}/retry`, { method: "POST" })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    toast.error(payload.error ?? "Could not retry.")
    return
  }
  onSession(payload.session)
}
