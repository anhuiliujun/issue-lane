import { cache } from "react"

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  agentActivities,
  agentSessions,
  comments,
  issueLabels,
  issues,
  labels,
  projects,
  users,
  workflowStatuses,
} from "@/lib/db/schema"
import {
  isPriority,
  isUserKind,
  type Priority,
} from "@/lib/domain"
import {
  toIssueCard,
  toIssueDetail,
  toLabel,
  toProject,
  toSession,
  toStatus,
  toUser,
  type IssueDetailDto,
  type LabelDto,
  type ProjectDto,
  type SessionDto,
  type StatusDto,
  type UserDto,
} from "@/lib/dto"

function issueWith() {
  return {
    assignee: true as const,
    status: true as const,
    project: { with: { lead: true as const } },
    parent: true as const,
    labels: { with: { label: true as const } },
  }
}

function detailWith() {
  return {
    ...issueWith(),
    children: { with: { status: true as const } },
    comments: {
      with: { author: true as const },
      orderBy: [asc(comments.createdAt)],
    },
    sessions: {
      orderBy: [desc(agentSessions.createdAt)],
      limit: 1 as const,
      with: {
        activities: {
          orderBy: [asc(agentActivities.createdAt)],
        },
      },
    },
  }
}

export const getTeam = cache(async () => {
  const team = await db.query.teams.findFirst({
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  })
  if (!team) {
    throw new Error("No team is seeded. Run pnpm db:setup.")
  }
  return team
})

export const getAgent = cache(async () => {
  const team = await getTeam()
  const agent = await db.query.users.findFirst({
    where: and(eq(users.workspaceId, team.workspaceId), eq(users.kind, "agent")),
  })
  if (!agent || !isUserKind(agent.kind)) {
    throw new Error("The triage agent user is not seeded.")
  }
  return agent
})

export async function listStatuses(): Promise<StatusDto[]> {
  const team = await getTeam()
  const rows = await db.query.workflowStatuses.findMany({
    where: eq(workflowStatuses.teamId, team.id),
    orderBy: (table, { asc }) => [asc(table.position)],
  })
  return rows.map(toStatus)
}

export async function listUsers(): Promise<UserDto[]> {
  const team = await getTeam()
  const rows = await db.query.users.findMany({
    where: eq(users.workspaceId, team.workspaceId),
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  return rows.flatMap((row) => {
    const user = toUser(row)
    return user ? [user] : []
  })
}

export async function listLabels(): Promise<LabelDto[]> {
  const team = await getTeam()
  const rows = await db.query.labels.findMany({
    where: eq(labels.teamId, team.id),
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  return rows.map(toLabel)
}

export async function listProjects(): Promise<ProjectDto[]> {
  const rows = await db.query.projects.findMany({
    where: eq(projects.teamId, (await getTeam()).id),
    with: { lead: true },
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  return rows.map(toProject)
}

export async function getProject(id: string) {
  const team = await getTeam()
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.teamId, team.id)),
    with: { lead: true },
  })
  if (!project) return null
  const projectIssues = await db.query.issues.findMany({
    where: eq(issues.projectId, project.id),
    with: issueWith(),
    orderBy: (table, { desc: descending }) => [descending(table.number)],
  })
  return {
    project: toProject(project),
    issues: projectIssues.map((issue) => toIssueCard(issue, team.key)),
  }
}

export async function listIssues() {
  const team = await getTeam()
  const rows = await db.query.issues.findMany({
    where: eq(issues.teamId, team.id),
    with: issueWith(),
    orderBy: (table, { desc: descending }) => [descending(table.number)],
  })
  return rows.map((issue) => toIssueCard(issue, team.key))
}

export async function getIssueDetail(id: string): Promise<IssueDetailDto | null> {
  const team = await getTeam()
  const row = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), eq(issues.teamId, team.id)),
    with: detailWith(),
  })
  if (!row) return null
  return toIssueDetail(row, team.key)
}

export async function getIssueByNumber(number: number): Promise<IssueDetailDto | null> {
  const team = await getTeam()
  const row = await db.query.issues.findFirst({
    where: and(eq(issues.teamId, team.id), eq(issues.number, number)),
    with: detailWith(),
  })
  if (!row) return null
  return toIssueDetail(row, team.key)
}

export async function createIssue(input: { title: string; description?: string; parentId?: string | null; statusId?: string; priority?: Priority; projectId?: string | null }) {
  const team = await getTeam()
  const statuses = await listStatuses()
  const status = input.statusId
    ? statuses.find((item) => item.id === input.statusId)
    : statuses.find((item) => item.category === "triage") ?? statuses[0]
  if (!status) throw new Error("The team has no workflow status.")

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ max: sql<number>`coalesce(max(${issues.number}), 0)` })
      .from(issues)
      .where(eq(issues.teamId, team.id))
    const number = Number(row?.max ?? 0) + 1
    const [created] = await tx.insert(issues).values({
      teamId: team.id,
      number,
      title: input.title,
      description: input.description ?? "",
      statusId: status.id,
      priority: input.priority ?? "none",
      projectId: input.projectId ?? null,
      parentId: input.parentId ?? null,
    }).returning()
    return created
  })
}

export async function updateIssue(id: string, patch: {
  title?: string
  description?: string
  statusId?: string
  priority?: Priority
  assigneeId?: string | null
  projectId?: string | null
  labelIds?: string[]
}) {
  const team = await getTeam()
  const current = await db.query.issues.findFirst({
    where: and(eq(issues.id, id), eq(issues.teamId, team.id)),
  })
  if (!current) return null

  if (patch.statusId) {
    const status = await db.query.workflowStatuses.findFirst({
      where: and(eq(workflowStatuses.id, patch.statusId), eq(workflowStatuses.teamId, team.id)),
    })
    if (!status) throw new Error("Unknown status.")
  }
  if (patch.assigneeId) {
    const assignee = await db.query.users.findFirst({
      where: and(eq(users.id, patch.assigneeId), eq(users.workspaceId, team.workspaceId)),
    })
    if (!assignee) throw new Error("Unknown assignee.")
  }
  if (patch.projectId) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, patch.projectId), eq(projects.teamId, team.id)),
    })
    if (!project) throw new Error("Unknown project.")
  }
  if (patch.priority && !isPriority(patch.priority)) {
    throw new Error("Unknown priority.")
  }
  if (patch.labelIds && patch.labelIds.length > 0) {
    const known = await db.query.labels.findMany({
      where: and(eq(labels.teamId, team.id), inArray(labels.id, patch.labelIds)),
    })
    if (known.length !== patch.labelIds.length) {
      throw new Error("Unknown label.")
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(issues).set({
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      statusId: patch.statusId ?? current.statusId,
      priority: patch.priority ?? current.priority,
      assigneeId: patch.assigneeId === undefined ? current.assigneeId : patch.assigneeId,
      projectId: patch.projectId === undefined ? current.projectId : patch.projectId,
      updatedAt: new Date(),
    }).where(eq(issues.id, id))

    if (patch.labelIds) {
      await tx.delete(issueLabels).where(eq(issueLabels.issueId, id))
      if (patch.labelIds.length) {
        await tx.insert(issueLabels).values(patch.labelIds.map((labelId) => ({ issueId: id, labelId })))
      }
    }
  })

  return getIssueDetail(id)
}

export async function addComment(issueId: string, authorId: string, body: string) {
  const detail = await getIssueDetail(issueId)
  if (!detail) return null
  const [comment] = await db.insert(comments).values({
    issueId,
    authorId,
    body,
  }).returning()
  return comment
}

export async function findOpenSession(issueId: string) {
  const row = await db.query.agentSessions.findFirst({
    where: and(
      eq(agentSessions.issueId, issueId),
      inArray(agentSessions.state, ["pending", "active", "awaitingInput"]),
    ),
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
    with: {
      activities: {
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
  })
  return toSession(row ?? null)
}

export async function getSession(id: string): Promise<SessionDto | null> {
  const row = await db.query.agentSessions.findFirst({
    where: eq(agentSessions.id, id),
    with: {
      activities: {
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
  })
  return toSession(row ?? null)
}

export async function loadIssueForAgent(issueId: string) {
  const team = await getTeam()
  const row = await db.query.issues.findFirst({
    where: and(eq(issues.id, issueId), eq(issues.teamId, team.id)),
    with: {
      ...detailWith(),
      team: true,
    },
  })
  if (!row) return null
  return { team, issue: row, detail: toIssueDetail(row, team.key) }
}
