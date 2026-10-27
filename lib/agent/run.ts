import { hasToolCall, isStepCount, ToolLoopAgent, tool } from "ai"
import { eq } from "drizzle-orm"
import { after } from "next/server"
import { z } from "zod"

import { claimRun, listActivities, recordActivity, releaseRun } from "@/lib/agent/activity"
import { askEffect, createSubIssueEffect, readIssueEffect, updateIssueEffect } from "@/lib/agent/effects"
import { db } from "@/lib/db"
import { agentSessions } from "@/lib/db/schema"
import {
  needsClarification,
  priorities,
  priorityFromText,
  type Priority,
} from "@/lib/domain"
import type { IssueDetailDto } from "@/lib/dto"
import { findOpenSession, getAgent, getSession, loadIssueForAgent } from "@/lib/repo"

export const PRIMARY_MODEL = "deepseek/deepseek-v4.1-flash"
export const FALLBACK_MODEL = "moonshotai/kimi-k2"

const prioritySchema = z.enum(priorities)

export function gatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

function readingThought() {
  if (gatewayConfigured()) {
    return "Reading the issue and comments to decide whether the goal is clear enough to leave Triage."
  }
  return "Reading the issue and comments to decide whether the goal is clear enough to leave Triage. No AI Gateway credential is configured, so this turn uses the scripted triage rules."
}

export async function delegateIssue(issueId: string) {
  const loaded = await loadIssueForAgent(issueId)
  if (!loaded) throw new Error("Issue not found.")
  const open = await findOpenSession(issueId)
  if (open) return open

  const agent = await getAgent()
  const triage = loaded.detail.status.category === "triage"
  const [session] = await db.insert(agentSessions).values({
    issueId,
    agentUserId: agent.id,
    state: "pending",
  }).returning()

  await recordActivity({
    sessionId: session.id,
    type: "thought",
    body: triage ? readingThought() : "This issue is not in Triage.",
  })

  if (!triage) {
    await recordActivity({
      sessionId: session.id,
      type: "response",
      body: "I only triage issues that are in Triage. Move it there and assign me again if you want a pass.",
    })
    return getSession(session.id)
  }

  scheduleTurn(session.id)
  return getSession(session.id)
}

export async function replyToSession(sessionId: string, body: string) {
  const session = await getSession(sessionId)
  if (!session) return null
  if (session.state !== "awaitingInput" && session.state !== "complete") {
    throw new Error("The agent is not waiting for a reply.")
  }
  await recordActivity({ sessionId, type: "prompt", body })
  await recordActivity({
    sessionId,
    type: "thought",
    body: gatewayConfigured()
      ? "Using the latest answer to finish triage."
      : "Using the latest answer to finish triage with the scripted rules.",
  })
  scheduleTurn(sessionId)
  return getSession(sessionId)
}

export async function retrySession(sessionId: string) {
  const session = await getSession(sessionId)
  if (!session) return null
  const hasThought = session.activities.some((activity) => activity.type === "thought")
  const age = Date.now() - new Date(session.createdAt).getTime()
  const notStarted = !hasThought && age > 10_000
  if (session.state !== "error" && !notStarted) {
    throw new Error("Nothing to retry.")
  }
  await recordActivity({ sessionId, type: "thought", body: readingThought() })
  scheduleTurn(sessionId)
  return getSession(sessionId)
}

function scheduleTurn(sessionId: string) {
  if (!claimRun(sessionId)) return
  after(async () => {
    try {
      await runTriageTurn(sessionId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Triage failed."
      await recordActivity({
        sessionId,
        type: "error",
        body: message.slice(0, 500),
      })
    } finally {
      releaseRun(sessionId)
    }
  })
}

async function runTriageTurn(sessionId: string) {
  const session = await db.query.agentSessions.findFirst({
    where: eq(agentSessions.id, sessionId),
  })
  if (!session) return
  const loaded = await loadIssueForAgent(session.issueId)
  if (!loaded) {
    await recordActivity({ sessionId, type: "error", body: "Issue not found." })
    return
  }
  if (loaded.detail.status.category !== "triage") {
    const activities = await listActivities(sessionId)
    if (activities.at(-1)?.type === "response") return
    await recordActivity({
      sessionId,
      type: "response",
      body: "This issue is no longer in Triage, so I am stopping.",
    })
    return
  }
  if (!gatewayConfigured()) {
    await delay(1200)
    await runScripted(sessionId, loaded.detail)
    return
  }
  await runModel(sessionId, loaded.detail)
}

async function runScripted(sessionId: string, detail: IssueDetailDto) {
  const activities = await listActivities(sessionId)
  const prompt = [...activities].reverse().find((activity) => activity.type === "prompt")?.body ?? null
  const read = await readIssueEffect(sessionId, detail.id)
  if (!read.ok) {
    await recordActivity({ sessionId, type: "error", body: read.summary })
    return
  }
  if (!prompt && needsClarification(detail.description)) {
    await askEffect(sessionId, "What should be true when this is done?")
    return
  }
  const source = `${detail.title}\n${detail.description}\n${prompt ?? ""}`
  const priority = priorityFromText(source)
  const updated = await updateIssueEffect(sessionId, detail.id, {
    statusName: "Todo",
    priority,
  })
  if (!updated.ok) {
    await recordActivity({ sessionId, type: "error", body: updated.summary })
    return
  }
  for (const title of subIssueTitles(detail, prompt)) {
    const created = await createSubIssueEffect(sessionId, detail.id, { title, priority: "none" })
    if (!created.ok) {
      await recordActivity({ sessionId, type: "error", body: created.summary })
      return
    }
  }
  const names = subIssueTitles(detail, prompt)
  await recordActivity({
    sessionId,
    type: "response",
    body: `Set priority to ${labelPriority(priority)} and moved this to Todo. Opened ${names.length} sub-issues.`,
  })
}

function subIssueTitles(detail: IssueDetailDto, prompt: string | null) {
  if (prompt) {
    const first = prompt.split(/[.!\n]/).map((part) => part.trim()).find(Boolean) ?? prompt
    return unique([clip(first, 80), `Ship ${detail.title}`]).slice(0, 3)
  }
  const bullets = detail.description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .slice(0, 3)
  const titles = bullets.length >= 2
    ? bullets
    : [`Write down what done means for ${detail.title}`, `Implement ${detail.title}`]
  return unique(titles).slice(0, 3)
}

async function runModel(sessionId: string, detail: IssueDetailDto) {
  const activities = await listActivities(sessionId)
  const agent = new ToolLoopAgent({
    model: PRIMARY_MODEL,
    instructions: TRIAGE_INSTRUCTIONS,
    temperature: 0.2,
    toolCallConcurrency: 1,
    stopWhen: [hasToolCall("askClarifyingQuestion"), isStepCount(8)],
    providerOptions: {
      gateway: {
        models: [FALLBACK_MODEL],
      },
    },
    tools: {
      readIssue: tool({
        description: "Read the current issue, its comments, and its sub-issues.",
        inputSchema: z.object({}),
        execute: async () => readIssueEffect(sessionId, detail.id),
      }),
      updateIssue: tool({
        description: "Change the current issue's status, priority, assignee, or labels. Status is a workflow name such as Todo or Backlog.",
        inputSchema: z.object({
          statusName: z.string().optional(),
          priority: prioritySchema.optional(),
          assigneeName: z.string().optional(),
          labelNames: z.array(z.string()).optional(),
        }),
        execute: async (input) => updateIssueEffect(sessionId, detail.id, {
          statusName: input.statusName,
          priority: input.priority as Priority | undefined,
          assigneeName: input.assigneeName,
          labelNames: input.labelNames,
        }),
      }),
      createSubIssue: tool({
        description: "Create one sub-issue under the current issue.",
        inputSchema: z.object({
          title: z.string(),
          description: z.string().optional(),
          priority: prioritySchema.optional(),
        }),
        execute: async (input) => createSubIssueEffect(sessionId, detail.id, {
          title: input.title,
          description: input.description,
          priority: input.priority as Priority | undefined,
        }),
      }),
      askClarifyingQuestion: tool({
        description: "Ask the user one clarifying question and stop. Use this only when the goal is too vague to triage.",
        inputSchema: z.object({
          question: z.string(),
        }),
        execute: async ({ question }) => askEffect(sessionId, question),
      }),
    },
  })

  const result = await agent.generate({
    prompt: modelPrompt(detail, activities),
  })

  const latest = await listActivities(sessionId)
  const lastPromptIndex = latest.findLastIndex((activity) => activity.type === "prompt")
  const slice = latest.slice(lastPromptIndex + 1)
  if (slice.some((activity) => activity.type === "elicitation" || activity.type === "error")) return
  const changed = slice.some((activity) =>
    activity.type === "action" && (activity.actionName === "updateIssue" || activity.actionName === "createSubIssue")
  )
  if (!changed) {
    await recordActivity({
      sessionId,
      type: "error",
      body: "The model finished without moving the issue or asking a question.",
    })
    return
  }
  await recordActivity({
    sessionId,
    type: "response",
    body: result.text.trim() || "Triage finished.",
  })
}

const TRIAGE_INSTRUCTIONS = [
  "You are Triage, the only agent in this workspace. You triage one issue that is currently in Triage.",
  "Call readIssue before you change anything.",
  "If the goal is specific enough to break into work: set a priority other than none, move the issue out of Triage (usually to Todo), create at least two sub-issues, and do not ask a question. Then write a short summary.",
  "If the goal is vague: call askClarifyingQuestion exactly once and do not change the issue or create sub-issues.",
  "Ask at most one question. Do not write code and do not mention a repository.",
  "If the user has already answered in the session, treat the goal as clear enough and finish triage. Do not ask another question.",
].join(" ")

function modelPrompt(detail: IssueDetailDto, activities: Awaited<ReturnType<typeof listActivities>>) {
  const history = activities.map((activity) => `- ${activity.type}: ${activity.body}`).join("\n") || "(none)"
  const comments = detail.comments.map((comment) => `- ${comment.author.name}: ${comment.body}`).join("\n") || "(none)"
  return [
    `Issue ${detail.identifier}`,
    `Title: ${detail.title}`,
    `Status: ${detail.status.name} (${detail.status.category})`,
    `Priority: ${detail.priority}`,
    `Labels: ${detail.labels.map((label) => label.name).join(", ") || "(none)"}`,
    `Description:\n${detail.description || "(empty)"}`,
    `Comments:\n${comments}`,
    `Session so far:\n${history}`,
  ].join("\n\n")
}

function labelPriority(priority: Priority) {
  return priority.slice(0, 1).toUpperCase() + priority.slice(1)
}

function clip(value: string, max: number) {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function unique(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
