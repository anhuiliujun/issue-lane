"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"

import { AgentPanel } from "@/components/agent-panel"
import { PriorityMark, UserChip } from "@/components/marks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/components/workspace-shell"
import { priorityMeta, priorities } from "@/lib/domain"
import type { IssueDetailDto, SessionDto, StatusDto, UserDto } from "@/lib/dto"

export function IssueScreen({
  issue,
  statuses,
  users,
}: {
  issue: IssueDetailDto
  statuses: StatusDto[]
  users: UserDto[]
}) {
  const router = useRouter()
  const { select } = useWorkspace()
  const [session, setSession] = useState<SessionDto | null>(issue.session)
  const [sessionSource, setSessionSource] = useState(issue.session)
  if (sessionSource !== issue.session) {
    setSessionSource(issue.session)
    setSession(issue.session)
  }
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const seenSession = useRef<string | null>(null)

  useEffect(() => {
    select({ id: issue.id, identifier: issue.identifier })
  }, [issue.id, issue.identifier, select])

  useEffect(() => {
    if (!session) return
    const key = `${session.id}:${session.state}:${session.activities.length}`
    if (seenSession.current === null) {
      seenSession.current = key
      return
    }
    if (seenSession.current === key) return
    seenSession.current = key
    if (session.state === "complete" || session.state === "awaitingInput" || session.state === "error") {
      router.refresh()
    }
  }, [session, router])

  async function patch(body: Record<string, unknown>) {
    const response = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(payload.error ?? "Could not update the issue.")
      return
    }
    if (payload.sessionId) {
      const sessionResponse = await fetch(`/api/sessions/${payload.sessionId}`)
      const sessionPayload = await sessionResponse.json().catch(() => ({}))
      if (sessionPayload.session) setSession(sessionPayload.session)
    }
    router.refresh()
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
        <p className="font-mono text-[12px] text-muted-foreground">{issue.identifier}</p>
        <h1 className="mt-1 text-lg font-medium leading-snug">{issue.title}</h1>
        {issue.parent ? (
          <p className="mt-1 text-muted-foreground">
            Sub-issue of{" "}
            <Link href={`/issues/${issue.parent.identifier}`} className="underline">
              {issue.parent.identifier}
            </Link>
          </p>
        ) : null}
        <div className="markdown mt-4 max-w-3xl">
          {issue.description ? (
            <ReactMarkdown>{issue.description}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">No description.</p>
          )}
        </div>
        {issue.children.length > 0 ? (
          <section className="mt-6">
            <h2 className="font-medium">Sub-issues</h2>
            <ul className="mt-2 divide-y rounded-md border">
              {issue.children.map((child) => (
                <li key={child.id} className="flex items-center gap-2 px-2 py-1.5">
                  <PriorityMark priority={child.priority} />
                  <Link href={`/issues/${child.identifier}`} className="font-mono text-[12px] text-muted-foreground">
                    {child.identifier}
                  </Link>
                  <span className="truncate">{child.title}</span>
                  <span className="ml-auto text-[12px] text-muted-foreground">{child.status.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-6 max-w-3xl">
          <AgentPanel session={session} onSession={setSession} />
        </div>
        <section className="mt-6 max-w-3xl">
          <h2 className="font-medium">Comments</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {issue.comments.map((item) => (
              <li key={item.id}>
                <p className="text-[12px] text-muted-foreground">
                  {item.author.name} · {formatCommentTime(item.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{item.body}</p>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={async (event) => {
              event.preventDefault()
              setPending(true)
              const response = await fetch(`/api/issues/${issue.id}/comments`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ body: comment }),
              })
              const payload = await response.json().catch(() => ({}))
              setPending(false)
              if (!response.ok) {
                toast.error(payload.error ?? "Could not comment.")
                return
              }
              setComment("")
              if (payload.sessionId) {
                const sessionResponse = await fetch(`/api/sessions/${payload.sessionId}`)
                const sessionPayload = await sessionResponse.json().catch(() => ({}))
                if (sessionPayload.session) setSession(sessionPayload.session)
              }
              router.refresh()
            }}
          >
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Comment. Mention @Triage to delegate."
              rows={3}
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending || comment.trim().length === 0} className="self-start">
              Comment
            </Button>
          </form>
        </section>
      </div>
      <aside className="w-[260px] shrink-0 overflow-auto border-l px-3 py-4">
        <Property label="Status">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-full justify-start" />}>
              <span className="size-2 rounded-full" style={{ backgroundColor: issue.status.color }} />
              {issue.status.name}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {statuses.map((status) => (
                <DropdownMenuItem key={status.id} onClick={() => void patch({ statusId: status.id })}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Property>
        <Property label="Priority">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-full justify-start" />}>
              <PriorityMark priority={issue.priority} />
              {priorityMeta[issue.priority].label}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {priorities.map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => void patch({ priority })}>
                  <PriorityMark priority={priority} />
                  {priorityMeta[priority].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Property>
        <Property label="Assignee">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-full justify-start" />}>
              {issue.assignee ? issue.assignee.name : "Unassigned"}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => void patch({ assigneeId: null })}>No assignee</DropdownMenuItem>
              {users.map((user) => (
                <DropdownMenuItem key={user.id} onClick={() => void patch({ assigneeId: user.id })}>
                  <UserChip name={user.name} kind={user.kind} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Property>
        <Property label="Labels">
          <p>{issue.labels.map((label) => label.name).join(", ") || "None"}</p>
        </Property>
        <Property label="Project">
          {issue.project ? (
            <Link href={`/projects/${issue.project.id}`} className="underline">
              {issue.project.name}
            </Link>
          ) : (
            <p className="text-muted-foreground">None</p>
          )}
        </Property>
      </aside>
    </div>
  )
}

function formatCommentTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso))
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  )
}
