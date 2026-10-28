"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState, type ReactNode } from "react"

import { useSharedIssueFilter } from "@/components/use-issue-filter"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWorkspace } from "@/components/workspace-shell"
import { priorityMeta, priorities, type Priority } from "@/lib/domain"
import {
  emptyIssueFilter,
  isIssueFilterActive,
  NO_PROJECT,
  serializeIssueFilter,
  toggleFilterValue,
  UNASSIGNED,
  type IssueFilter,
} from "@/lib/issue-filter"
import { cn } from "@/lib/utils"

export function IssueFilterBar() {
  const { statuses, users, projects } = useWorkspace()
  const { filter, apply } = useSharedIssueFilter()
  const [draft, setDraft] = useState<IssueFilter | null>(null)
  if (draft && serializeIssueFilter(draft) === serializeIssueFilter(filter)) {
    setDraft(null)
  }
  const shown = draft ?? filter
  const active = isIssueFilterActive(shown)

  function commit(next: IssueFilter) {
    setDraft(next)
    apply(next)
  }

  function toggleStatus(id: string) {
    const base = draft ?? filter
    commit({ ...base, statusIds: toggleFilterValue(base.statusIds, id) })
  }

  function toggleAssignee(id: string) {
    const base = draft ?? filter
    commit({ ...base, assigneeIds: toggleFilterValue(base.assigneeIds, id) })
  }

  function toggleProject(id: string) {
    const base = draft ?? filter
    commit({ ...base, projectIds: toggleFilterValue(base.projectIds, id) })
  }

  function togglePriority(priority: Priority) {
    const base = draft ?? filter
    commit({ ...base, priorities: toggleFilterValue(base.priorities, priority) })
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.statusIds.length > 0 ? (
        <FilterChip label="Status" count={shown.statusIds.length} onClear={() => commit({ ...(draft ?? filter), statusIds: [] })} />
      ) : null}
      {shown.assigneeIds.length > 0 ? (
        <FilterChip label="Assignee" count={shown.assigneeIds.length} onClear={() => commit({ ...(draft ?? filter), assigneeIds: [] })} />
      ) : null}
      {shown.projectIds.length > 0 ? (
        <FilterChip label="Project" count={shown.projectIds.length} onClear={() => commit({ ...(draft ?? filter), projectIds: [] })} />
      ) : null}
      {shown.priorities.length > 0 ? (
        <FilterChip label="Priority" count={shown.priorities.length} onClear={() => commit({ ...(draft ?? filter), priorities: [] })} />
      ) : null}
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          Filter
        </PopoverTrigger>
        <PopoverContent align="end" className="max-h-80 w-64 gap-2 overflow-auto p-2">
          <FilterGroup label="Status">
            {statuses.map((status) => (
              <FilterOption
                key={status.id}
                selected={shown.statusIds.includes(status.id)}
                onClick={() => toggleStatus(status.id)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
                {status.name}
              </FilterOption>
            ))}
          </FilterGroup>
          <FilterGroup label="Assignee">
            <FilterOption
              selected={shown.assigneeIds.includes(UNASSIGNED)}
              onClick={() => toggleAssignee(UNASSIGNED)}
            >
              No assignee
            </FilterOption>
            {users.map((user) => (
              <FilterOption
                key={user.id}
                selected={shown.assigneeIds.includes(user.id)}
                onClick={() => toggleAssignee(user.id)}
              >
                {user.name}
              </FilterOption>
            ))}
          </FilterGroup>
          <FilterGroup label="Project">
            <FilterOption
              selected={shown.projectIds.includes(NO_PROJECT)}
              onClick={() => toggleProject(NO_PROJECT)}
            >
              No project
            </FilterOption>
            {projects.map((project) => (
              <FilterOption
                key={project.id}
                selected={shown.projectIds.includes(project.id)}
                onClick={() => toggleProject(project.id)}
              >
                {project.name}
              </FilterOption>
            ))}
          </FilterGroup>
          <FilterGroup label="Priority">
            {priorities.map((priority) => (
              <FilterOption
                key={priority}
                selected={shown.priorities.includes(priority)}
                onClick={() => togglePriority(priority)}
              >
                <span className="size-2 rounded-[2px]" style={{ backgroundColor: priorityMeta[priority].color }} />
                {priorityMeta[priority].label}
              </FilterOption>
            ))}
          </FilterGroup>
          {active ? (
            <button
              type="button"
              className="flex h-8 items-center rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => commit(emptyIssueFilter())}
            >
              Clear filters
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function FilterChip({ label, count, onClear }: { label: string; count: number; onClear: () => void }) {
  return (
    <button
      type="button"
      className="flex h-6 items-center gap-1 rounded-md border bg-card px-1.5 text-[12px]"
      onClick={onClear}
      aria-label={`Clear ${label.toLowerCase()} filter`}
    >
      {label}
      <span className="text-muted-foreground">{count}</span>
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="px-2 py-1 text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  )
}

function FilterOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-left hover:bg-muted",
        selected && "bg-muted",
      )}
      onClick={onClick}
    >
      {children}
      {selected ? <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="ml-auto size-3.5" /> : null}
    </button>
  )
}
