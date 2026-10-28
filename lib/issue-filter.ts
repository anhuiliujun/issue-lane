import { isPriority, type Priority } from "@/lib/domain"

export const UNASSIGNED = "none"
export const NO_PROJECT = "none"

export type IssueFilter = {
  statusIds: string[]
  assigneeIds: string[]
  projectIds: string[]
  priorities: Priority[]
}

type FilterSource =
  | { get(name: string): string | null }
  | { [key: string]: string | string[] | undefined }

export function emptyIssueFilter(): IssueFilter {
  return { statusIds: [], assigneeIds: [], projectIds: [], priorities: [] }
}

function splitValues(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  const parts = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  for (const part of parts) {
    for (const item of part.split(",")) {
      const trimmed = item.trim()
      if (trimmed) seen.add(trimmed)
    }
  }
  return [...seen]
}

function readValues(source: FilterSource, key: string): string[] {
  if ("get" in source && typeof source.get === "function") {
    return splitValues(source.get(key))
  }
  const record = source as { [key: string]: string | string[] | undefined }
  return splitValues(record[key])
}

export function parseIssueFilter(source: FilterSource): IssueFilter {
  const priorities: Priority[] = []
  for (const value of readValues(source, "priority")) {
    if (isPriority(value)) priorities.push(value)
  }
  return {
    statusIds: readValues(source, "status"),
    assigneeIds: readValues(source, "assignee"),
    projectIds: readValues(source, "project"),
    priorities,
  }
}

export function serializeIssueFilter(filter: IssueFilter): string {
  const params = new URLSearchParams()
  if (filter.statusIds.length > 0) params.set("status", filter.statusIds.join(","))
  if (filter.assigneeIds.length > 0) params.set("assignee", filter.assigneeIds.join(","))
  if (filter.projectIds.length > 0) params.set("project", filter.projectIds.join(","))
  if (filter.priorities.length > 0) params.set("priority", filter.priorities.join(","))
  return params.toString()
}

export function withIssueFilter(path: string, filter: IssueFilter): string {
  const query = serializeIssueFilter(filter)
  return query ? `${path}?${query}` : path
}

export function isIssueFilterActive(filter: IssueFilter): boolean {
  return (
    filter.statusIds.length > 0 ||
    filter.assigneeIds.length > 0 ||
    filter.projectIds.length > 0 ||
    filter.priorities.length > 0
  )
}

export type FilterableIssue = {
  statusId: string
  priority: Priority
  assignee: { id: string } | null
  project: { id: string } | null
}

export function matchesIssueFilter(issue: FilterableIssue, filter: IssueFilter): boolean {
  if (filter.statusIds.length > 0 && !filter.statusIds.includes(issue.statusId)) return false
  if (filter.assigneeIds.length > 0) {
    const assigneeId = issue.assignee?.id ?? UNASSIGNED
    if (!filter.assigneeIds.includes(assigneeId)) return false
  }
  if (filter.projectIds.length > 0) {
    const projectId = issue.project?.id ?? NO_PROJECT
    if (!filter.projectIds.includes(projectId)) return false
  }
  if (filter.priorities.length > 0 && !filter.priorities.includes(issue.priority)) return false
  return true
}

export function visibleStatuses<T extends { id: string }>(statuses: readonly T[], filter: IssueFilter): T[] {
  if (filter.statusIds.length === 0) return [...statuses]
  return statuses.filter((status) => filter.statusIds.includes(status.id))
}

export function toggleFilterValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
