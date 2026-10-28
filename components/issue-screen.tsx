"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"

import { PriorityMark, UserChip } from "@/components/marks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/components/workspace-shell"
import { priorityMeta, priorities } from "@/lib/domain"
import type { IssueDetailDto } from "@/lib/dto"
import { cn } from "@/lib/utils"

export function IssueScreen({ issue }: { issue: IssueDetailDto }) {
  const router = useRouter()
  const { select, statuses, users, projects, labels } = useWorkspace()
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null)
  const skipTitleBlur = useRef(false)
  const skipDescriptionBlur = useRef(false)
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const [labelIds, setLabelIds] = useState(() => issue.labels.map((label) => label.id))
  const [seenIssue, setSeenIssue] = useState(issue.updatedAt)
  if (seenIssue !== issue.updatedAt) {
    setSeenIssue(issue.updatedAt)
    setTitleDraft(null)
    setDescriptionDraft(null)
    setLabelIds(issue.labels.map((label) => label.id))
  }

  useEffect(() => {
    select({ id: issue.id, identifier: issue.identifier })
  }, [issue.id, issue.identifier, select])

  async function patch(body: Record<string, unknown>) {
    const response = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(payload.error ?? "Could not update the issue.")
      return false
    }
    router.refresh()
    return true
  }

  async function commitTitle() {
    if (skipTitleBlur.current) {
      skipTitleBlur.current = false
      return
    }
    if (titleDraft === null) return
    const next = titleDraft.trim()
    if (next.length === 0) {
      toast.error("Give the issue a title.")
      return
    }
    if (next === issue.title) {
      setTitleDraft(null)
      return
    }
    const saved = await patch({ title: next })
    if (saved) setTitleDraft(null)
  }

  async function commitDescription() {
    if (skipDescriptionBlur.current) {
      skipDescriptionBlur.current = false
      return
    }
    if (descriptionDraft === null) return
    if (descriptionDraft === issue.description) {
      setDescriptionDraft(null)
      return
    }
    const saved = await patch({ description: descriptionDraft })
    if (saved) setDescriptionDraft(null)
  }

  function toggleLabel(labelId: string) {
    const next = labelIds.includes(labelId)
      ? labelIds.filter((id) => id !== labelId)
      : [...labelIds, labelId]
    setLabelIds(next)
    void patch({ labelIds: next }).then((saved) => {
      if (!saved) setLabelIds(labelIds)
    })
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
        <p className="font-mono text-[12px] text-muted-foreground">{issue.identifier}</p>
        {titleDraft === null ? (
          <h1
            className="mt-1 cursor-text text-lg font-medium leading-snug"
            onClick={() => setTitleDraft(issue.title)}
          >
            {issue.title}
          </h1>
        ) : (
          <input
            aria-label="Title"
            autoFocus
            className="mt-1 w-full bg-transparent text-lg font-medium leading-snug outline-none"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                skipTitleBlur.current = true
                setTitleDraft(null)
                event.currentTarget.blur()
              }
            }}
          />
        )}
        {issue.parent ? (
          <p className="mt-1 text-muted-foreground">
            Sub-issue of{" "}
            <Link href={`/issues/${issue.parent.identifier}`} className="underline">
              {issue.parent.identifier}
            </Link>
          </p>
        ) : null}
        <div className="mt-4 max-w-3xl">
          {descriptionDraft === null ? (
            <div
              className="markdown cursor-text"
              onClick={() => setDescriptionDraft(issue.description)}
            >
              {issue.description ? (
                <ReactMarkdown>{issue.description}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">Add a description</p>
              )}
              <button
                type="button"
                className="mt-2 text-[12px] text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation()
                  setDescriptionDraft(issue.description)
                }}
              >
                Edit description
              </button>
            </div>
          ) : (
            <Textarea
              aria-label="Description"
              autoFocus
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={() => void commitDescription()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault()
                  skipDescriptionBlur.current = true
                  setDescriptionDraft(null)
                }
              }}
              placeholder="Description"
              rows={6}
            />
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
              router.refresh()
            }}
          >
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Write a comment"
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
              {issue.assignee ? issue.assignee.name : "No assignee"}
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
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full justify-start" />}>
              <span className="truncate">
                {labels.filter((label) => labelIds.includes(label.id)).map((label) => label.name).join(", ") || "No labels"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 gap-0.5 p-1">
              {labels.map((label) => {
                const selected = labelIds.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-muted",
                      selected && "bg-muted",
                    )}
                    onClick={() => toggleLabel(label.id)}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
        </Property>
        <Property label="Project">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="w-full justify-start" />}>
              <span className="truncate">{issue.project?.name ?? "No project"}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => void patch({ projectId: null })}>No project</DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem key={project.id} onClick={() => void patch({ projectId: project.id })}>
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  )
}
