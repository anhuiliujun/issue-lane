import {
  isActivityType,
  isPriority,
  isSessionState,
  isStatusCategory,
  isUserKind,
  issueIdentifier,
  type ActivityType,
  type Priority,
  type SessionState,
  type StatusCategory,
  type UserKind,
} from "@/lib/domain"

export type UserDto = {
  id: string
  name: string
  email: string | null
  kind: UserKind
}

export type StatusDto = {
  id: string
  name: string
  category: StatusCategory
  position: number
  color: string
}

export type LabelDto = {
  id: string
  name: string
  color: string
}

export type ProjectDto = {
  id: string
  name: string
  summary: string
  status: string
  targetDate: string | null
  lead: UserDto | null
}

export type ActivityDto = {
  id: string
  type: ActivityType
  body: string
  actionName: string | null
  actionParams: Record<string, unknown> | null
  actionResult: Record<string, unknown> | null
  createdAt: string
}

export type SessionDto = {
  id: string
  state: SessionState
  createdAt: string
  updatedAt: string
  activities: ActivityDto[]
}

export type IssueCardDto = {
  id: string
  identifier: string
  number: number
  title: string
  priority: Priority
  statusId: string
  assignee: UserDto | null
  labels: LabelDto[]
  project: { id: string; name: string } | null
  parentIdentifier: string | null
}

export type IssueDetailDto = IssueCardDto & {
  description: string
  createdAt: string
  updatedAt: string
  status: StatusDto
  projectDetail: ProjectDto | null
  parent: { id: string; identifier: string; title: string } | null
  children: Array<{
    id: string
    identifier: string
    title: string
    priority: Priority
    status: StatusDto
  }>
  comments: Array<{
    id: string
    body: string
    createdAt: string
    author: UserDto
  }>
  session: SessionDto | null
}

type UserRow = { id: string; name: string; email: string | null; kind: string }
type StatusRow = { id: string; name: string; category: string; position: number; color: string }
type LabelRow = { id: string; name: string; color: string }

export function toUser(row: UserRow | null | undefined): UserDto | null {
  if (!row || !isUserKind(row.kind)) return null
  return { id: row.id, name: row.name, email: row.email, kind: row.kind }
}

export function toStatus(row: StatusRow): StatusDto {
  if (!isStatusCategory(row.category)) {
    throw new Error(`Unknown status category: ${row.category}`)
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    position: row.position,
    color: row.color,
  }
}

export function toLabel(row: LabelRow): LabelDto {
  return { id: row.id, name: row.name, color: row.color }
}

function requirePriority(value: string): Priority {
  if (!isPriority(value)) throw new Error(`Unknown priority: ${value}`)
  return value
}

export function toSession(row: {
  id: string
  state: string
  createdAt: Date
  updatedAt: Date
  activities: Array<{
    id: string
    type: string
    body: string
    actionName: string | null
    actionParams: Record<string, unknown> | null
    actionResult: Record<string, unknown> | null
    createdAt: Date
  }>
} | null): SessionDto | null {
  if (!row) return null
  if (!isSessionState(row.state)) throw new Error(`Unknown session state: ${row.state}`)
  return {
    id: row.id,
    state: row.state,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    activities: row.activities.map((activity) => {
      if (!isActivityType(activity.type)) {
        throw new Error(`Unknown activity type: ${activity.type}`)
      }
      return {
        id: activity.id,
        type: activity.type,
        body: activity.body,
        actionName: activity.actionName,
        actionParams: activity.actionParams,
        actionResult: activity.actionResult,
        createdAt: activity.createdAt.toISOString(),
      }
    }),
  }
}

type IssueGraph = {
  id: string
  number: number
  title: string
  description: string
  priority: string
  statusId: string
  createdAt: Date
  updatedAt: Date
  assignee: UserRow | null
  status: StatusRow
  project: {
    id: string
    name: string
    summary: string
    status: string
    targetDate: string | null
    lead: UserRow | null
  } | null
  parent: { id: string; number: number; title: string } | null
  children?: Array<{
    id: string
    number: number
    title: string
    priority: string
    status: StatusRow
  }>
  labels: Array<{ label: LabelRow }>
  comments?: Array<{
    id: string
    body: string
    createdAt: Date
    author: UserRow
  }>
  sessions?: Array<{
    id: string
    state: string
    createdAt: Date
    updatedAt: Date
    activities: Array<{
      id: string
      type: string
      body: string
      actionName: string | null
      actionParams: Record<string, unknown> | null
      actionResult: Record<string, unknown> | null
      createdAt: Date
    }>
  }>
}

export function toIssueCard(row: IssueGraph, teamKey: string): IssueCardDto {
  return {
    id: row.id,
    identifier: issueIdentifier(teamKey, row.number),
    number: row.number,
    title: row.title,
    priority: requirePriority(row.priority),
    statusId: row.statusId,
    assignee: toUser(row.assignee),
    labels: row.labels.map((entry) => toLabel(entry.label)),
    project: row.project ? { id: row.project.id, name: row.project.name } : null,
    parentIdentifier: row.parent ? issueIdentifier(teamKey, row.parent.number) : null,
  }
}

export function toIssueDetail(row: IssueGraph, teamKey: string): IssueDetailDto {
  const card = toIssueCard(row, teamKey)
  const latest = row.sessions?.[0] ?? null
  return {
    ...card,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: toStatus(row.status),
    projectDetail: row.project
      ? {
          id: row.project.id,
          name: row.project.name,
          summary: row.project.summary,
          status: row.project.status,
          targetDate: row.project.targetDate,
          lead: toUser(row.project.lead),
        }
      : null,
    parent: row.parent
      ? {
          id: row.parent.id,
          identifier: issueIdentifier(teamKey, row.parent.number),
          title: row.parent.title,
        }
      : null,
    children: (row.children ?? []).map((child) => ({
      id: child.id,
      identifier: issueIdentifier(teamKey, child.number),
      title: child.title,
      priority: requirePriority(child.priority),
      status: toStatus(child.status),
    })),
    comments: (row.comments ?? []).flatMap((comment) => {
      const author = toUser(comment.author)
      if (!author) return []
      return [{
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author,
      }]
    }),
    session: toSession(latest),
  }
}

export function toProject(row: {
  id: string
  name: string
  summary: string
  status: string
  targetDate: string | null
  lead: UserRow | null
}): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    status: row.status,
    targetDate: row.targetDate,
    lead: toUser(row.lead),
  }
}
