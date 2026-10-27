import { and, eq } from "drizzle-orm"

import { recordActivity } from "@/lib/agent/activity"
import { db } from "@/lib/db"
import { labels, users, workflowStatuses } from "@/lib/db/schema"
import {
  isPriority,
  issueIdentifier,
  type Priority,
} from "@/lib/domain"
import { createIssue, loadIssueForAgent, updateIssue } from "@/lib/repo"

function summary(text: string) {
  return { summary: text }
}

export async function readIssueEffect(sessionId: string, issueId: string) {
  const loaded = await loadIssueForAgent(issueId)
  if (!loaded) {
    const result = summary("Issue not found.")
    await recordActivity({
      sessionId,
      type: "action",
      actionName: "readIssue",
      actionParams: {},
      actionResult: result,
      body: result.summary,
    })
    return { ok: false as const, ...result }
  }
  const { detail } = loaded
  const payload = {
    identifier: detail.identifier,
    title: detail.title,
    description: detail.description,
    status: detail.status.name,
    category: detail.status.category,
    priority: detail.priority,
    assignee: detail.assignee?.name ?? null,
    labels: detail.labels.map((label) => label.name),
    project: detail.project?.name ?? null,
    comments: detail.comments.map((comment) => ({
      author: comment.author.name,
      body: comment.body,
    })),
    subIssues: detail.children.map((child) => ({
      identifier: child.identifier,
      title: child.title,
      status: child.status.name,
    })),
  }
  const result = { ...summary(`Read ${detail.identifier}.`), issue: payload }
  await recordActivity({
    sessionId,
    type: "action",
    actionName: "readIssue",
    actionParams: {},
    actionResult: { summary: result.summary },
    body: result.summary,
  })
  return { ok: true as const, ...result }
}

export async function updateIssueEffect(sessionId: string, issueId: string, input: {
  statusName?: string
  priority?: Priority
  assigneeName?: string
  labelNames?: string[]
}) {
  const loaded = await loadIssueForAgent(issueId)
  if (!loaded) {
    return fail(sessionId, "updateIssue", input, "Issue not found.")
  }
  const patch: {
    statusId?: string
    priority?: Priority
    assigneeId?: string | null
    labelIds?: string[]
  } = {}
  const notes: string[] = []

  if (input.statusName) {
    const status = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.teamId, loaded.team.id),
        eq(workflowStatuses.name, input.statusName),
      ),
    })
    if (!status) return fail(sessionId, "updateIssue", input, `No status named ${input.statusName}.`)
    patch.statusId = status.id
    notes.push(`status ${status.name}`)
  }
  if (input.priority) {
    if (!isPriority(input.priority)) {
      return fail(sessionId, "updateIssue", input, "Unknown priority.")
    }
    patch.priority = input.priority
    notes.push(`priority ${input.priority}`)
  }
  if (input.assigneeName) {
    const people = await db.query.users.findMany({
      where: eq(users.workspaceId, loaded.team.workspaceId),
    })
    const assignee = people.find((person) => person.name.toLowerCase() === input.assigneeName?.toLowerCase())
    if (!assignee) return fail(sessionId, "updateIssue", input, `No user named ${input.assigneeName}.`)
    patch.assigneeId = assignee.id
    notes.push(`assignee ${assignee.name}`)
  }
  if (input.labelNames) {
    const teamLabels = await db.query.labels.findMany({
      where: eq(labels.teamId, loaded.team.id),
    })
    const ids: string[] = []
    for (const name of input.labelNames) {
      const label = teamLabels.find((item) => item.name.toLowerCase() === name.toLowerCase())
      if (!label) return fail(sessionId, "updateIssue", input, `No label named ${name}.`)
      ids.push(label.id)
    }
    patch.labelIds = ids
    notes.push(`labels ${input.labelNames.join(", ") || "cleared"}`)
  }
  if (notes.length === 0) {
    return fail(sessionId, "updateIssue", input, "Nothing to change.")
  }
  await updateIssue(issueId, patch)
  const text = `Updated ${notes.join(", ")}.`
  await recordActivity({
    sessionId,
    type: "action",
    actionName: "updateIssue",
    actionParams: { ...input },
    actionResult: summary(text),
    body: text,
  })
  return { ok: true as const, summary: text }
}

export async function createSubIssueEffect(sessionId: string, issueId: string, input: {
  title: string
  description?: string
  priority?: Priority
}) {
  const loaded = await loadIssueForAgent(issueId)
  if (!loaded) return fail(sessionId, "createSubIssue", input, "Issue not found.")
  const title = input.title.trim()
  if (!title) return fail(sessionId, "createSubIssue", input, "A sub-issue needs a title.")

  const statuses = await db.query.workflowStatuses.findMany({
    where: eq(workflowStatuses.teamId, loaded.team.id),
  })
  const todo = statuses.find((status) => status.name === "Todo")
    ?? statuses.find((status) => status.category === "unstarted")
  if (!todo) return fail(sessionId, "createSubIssue", input, "The team has no Todo status.")

  const existing = loaded.detail.children.find((child) => child.title.toLowerCase() === title.toLowerCase())
  if (existing) {
    const text = `${existing.identifier} already covers that.`
    await recordActivity({
      sessionId,
      type: "action",
      actionName: "createSubIssue",
      actionParams: { ...input },
      actionResult: summary(text),
      body: text,
    })
    return { ok: true as const, summary: text, identifier: existing.identifier }
  }

  const created = await createIssue({
    title,
    description: input.description ?? "",
    parentId: issueId,
    statusId: todo.id,
    priority: input.priority && isPriority(input.priority) ? input.priority : "none",
    projectId: loaded.issue.projectId,
  })
  const identifier = issueIdentifier(loaded.team.key, created.number)
  const text = `Created ${identifier}: ${title}.`
  await recordActivity({
    sessionId,
    type: "action",
    actionName: "createSubIssue",
    actionParams: { title, description: input.description ?? "", priority: input.priority ?? "none" },
    actionResult: summary(text),
    body: text,
  })
  return { ok: true as const, summary: text, identifier }
}

export async function askEffect(sessionId: string, question: string) {
  const text = question.trim()
  if (!text) return fail(sessionId, "askClarifyingQuestion", { question }, "The question was empty.")
  await recordActivity({
    sessionId,
    type: "action",
    actionName: "askClarifyingQuestion",
    actionParams: { question: text },
    actionResult: summary("Asked one question."),
    body: "Asked one question.",
  })
  await recordActivity({
    sessionId,
    type: "elicitation",
    body: text,
  })
  return { ok: true as const, summary: "Waiting for an answer.", question: text }
}

async function fail(sessionId: string, actionName: string, params: object, message: string) {
  await recordActivity({
    sessionId,
    type: "action",
    actionName,
    actionParams: { ...params },
    actionResult: summary(message),
    body: message,
  })
  return { ok: false as const, summary: message }
}
