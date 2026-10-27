"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { IssuesHeader } from "@/components/issues-header"
import { PriorityMark, UserChip } from "@/components/marks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkspace } from "@/components/workspace-shell"
import type { IssueCardDto, StatusDto } from "@/lib/dto"
import { priorityMeta } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function IssueList({
  issues,
  statuses,
}: {
  issues: IssueCardDto[]
  statuses: StatusDto[]
}) {
  const router = useRouter()
  const { selected, select } = useWorkspace()
  const statusById = new Map(statuses.map((status) => [status.id, status]))

  return (
    <>
      <IssuesHeader view="list" />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-background text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="w-8 px-3 py-2 font-medium" />
              <th className="w-24 px-2 py-2 font-medium">ID</th>
              <th className="px-2 py-2 font-medium">Title</th>
              <th className="w-36 px-2 py-2 font-medium">Status</th>
              <th className="w-40 px-2 py-2 font-medium">Assignee</th>
              <th className="w-40 px-2 py-2 font-medium">Project</th>
              <th className="w-36 px-2 py-2 font-medium">Labels</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => {
              const status = statusById.get(issue.statusId)
              return (
                <tr
                  key={issue.id}
                  className={cn(
                    "h-8 border-b hover:bg-muted/60",
                    selected?.id === issue.id && "bg-muted",
                  )}
                  onClick={() => select({ id: issue.id, identifier: issue.identifier })}
                >
                  <td className="px-3">
                    <PriorityMark priority={issue.priority} />
                    <span className="sr-only">{priorityMeta[issue.priority].label}</span>
                  </td>
                  <td className="px-2 font-mono text-[12px] text-muted-foreground">
                    <Link href={`/issues/${issue.identifier}`} className="hover:text-foreground">
                      {issue.identifier}
                    </Link>
                  </td>
                  <td className="max-w-0 px-2">
                    <div className="truncate">
                      {issue.parentIdentifier ? (
                        <span className="mr-1 text-muted-foreground">{issue.parentIdentifier}</span>
                      ) : null}
                      {issue.title}
                    </div>
                  </td>
                  <td className="px-2" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" className="h-6 px-1.5" />}
                      >
                        <span className="size-2 rounded-full" style={{ backgroundColor: status?.color }} />
                        {status?.name ?? "Status"}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {statuses.map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => {
                              void fetch(`/api/issues/${issue.id}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ statusId: item.id }),
                              }).then(async (response) => {
                                if (!response.ok) {
                                  const payload = await response.json().catch(() => ({}))
                                  toast.error(payload.error ?? "Could not change status.")
                                  return
                                }
                                router.refresh()
                              })
                            }}
                          >
                            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="px-2">
                    {issue.assignee ? (
                      <UserChip name={issue.assignee.name} kind={issue.assignee.kind} />
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="truncate px-2 text-muted-foreground">{issue.project?.name ?? ""}</td>
                  <td className="truncate px-2 text-muted-foreground">
                    {issue.labels.map((label) => label.name).join(", ")}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
