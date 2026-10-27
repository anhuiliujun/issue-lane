"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { IssuesHeader } from "@/components/issues-header"
import { PriorityMark, UserChip } from "@/components/marks"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { useWorkspace } from "@/components/workspace-shell"
import type { IssueCardDto, StatusDto } from "@/lib/dto"
import { cn } from "@/lib/utils"

export function Board({
  issues,
  statuses,
}: {
  issues: IssueCardDto[]
  statuses: StatusDto[]
}) {
  const { selected, select } = useWorkspace()
  const grouped = useMemo(() => groupByStatus(issues, statuses), [issues, statuses])
  const [columns, setColumns] = useState(grouped)
  const [columnSource, setColumnSource] = useState(grouped)
  if (columnSource !== grouped) {
    setColumnSource(grouped)
    setColumns(grouped)
  }
  const mounted = useSyncExternalStore(subscribeToNothing, getIsMounted, getIsMountedOnServer)

  if (!mounted) {
    return (
      <>
        <IssuesHeader view="board" />
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="flex w-max min-w-full items-start gap-3">
            {statuses.map((status) => (
              <section key={status.id} className="w-[260px] shrink-0">
                <ColumnTitle status={status} count={grouped[status.id]?.length ?? 0} />
                <div className="flex min-h-16 flex-col gap-1.5">
                  {(grouped[status.id] ?? []).map((issue) => (
                    <IssueCard key={issue.id} issue={issue} selected={selected?.id === issue.id} onSelect={select} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <IssuesHeader view="board" />
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={(issue) => issue.id}
          onValueCommit={(_next, meta) => {
            if (meta.kind !== "item") return
            const issueId = String(meta.event.active.id)
            if (meta.overContainer === meta.activeContainer) return
            void fetch(`/api/issues/${issueId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ statusId: meta.overContainer }),
            }).then(async (response) => {
              if (response.ok) return
              const payload = await response.json().catch(() => ({}))
              setColumns(meta.previousValue)
              toast.error(payload.error ?? "Could not move the issue.")
            }).catch(() => {
              setColumns(meta.previousValue)
              toast.error("Could not move the issue.")
            })
          }}
        >
          <KanbanBoard className="flex w-max min-w-full items-start gap-3">
            {statuses.map((status) => (
              <KanbanColumn key={status.id} value={status.id} disabled className="w-[260px] shrink-0">
                <ColumnTitle status={status} count={columns[status.id]?.length ?? 0} />
                <KanbanColumnContent value={status.id} className="min-h-16 gap-1.5">
                  {(columns[status.id] ?? []).map((issue) => (
                    <KanbanItem key={issue.id} value={issue.id}>
                      <KanbanItemHandle className="rounded-md">
                        <IssueCard issue={issue} selected={selected?.id === issue.id} onSelect={select} />
                      </KanbanItemHandle>
                    </KanbanItem>
                  ))}
                </KanbanColumnContent>
              </KanbanColumn>
            ))}
          </KanbanBoard>
          <KanbanOverlay>
            {({ value, variant }) => {
              if (variant !== "item") return null
              const issue = issues.find((item) => item.id === value)
              return (
                <div className="rounded-md border bg-card px-2.5 py-2 shadow-md">
                  <p className="font-mono text-[11px] text-muted-foreground">{issue?.identifier}</p>
                  <p className="mt-1 line-clamp-2">{issue?.title}</p>
                </div>
              )
            }}
          </KanbanOverlay>
        </Kanban>
      </div>
    </>
  )
}

const subscribeToNothing = () => () => {}
const getIsMounted = () => true
const getIsMountedOnServer = () => false

function ColumnTitle({ status, count }: { status: StatusDto; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
      <h2 className="font-medium">{status.name}</h2>
      <span className="text-[12px] text-muted-foreground">{count}</span>
    </div>
  )
}

function IssueCard({
  issue,
  selected,
  onSelect,
}: {
  issue: IssueCardDto
  selected: boolean
  onSelect: (issue: { id: string; identifier: string }) => void
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card px-2.5 py-2 text-left shadow-[0_1px_0_rgba(34,35,38,0.04)]",
        selected && "ring-1 ring-foreground/40",
      )}
      onClick={() => onSelect({ id: issue.id, identifier: issue.identifier })}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <PriorityMark priority={issue.priority} />
        <Link
          href={`/issues/${issue.identifier}`}
          className="font-mono hover:text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          {issue.identifier}
        </Link>
        {issue.parentIdentifier ? <span>sub of {issue.parentIdentifier}</span> : null}
      </div>
      <p className="mt-1 line-clamp-2 leading-snug">{issue.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted-foreground">
          {issue.labels[0]?.name ?? issue.project?.name ?? ""}
        </span>
        {issue.assignee ? <UserChip name={issue.assignee.name} kind={issue.assignee.kind} label={false} /> : <span />}
      </div>
    </div>
  )
}

function groupByStatus(issues: IssueCardDto[], statuses: StatusDto[]) {
  const columns: Record<string, IssueCardDto[]> = {}
  for (const status of statuses) columns[status.id] = []
  for (const issue of issues) {
    if (!columns[issue.statusId]) columns[issue.statusId] = []
    columns[issue.statusId].push(issue)
  }
  return columns
}
