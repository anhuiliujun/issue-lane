export const statusCategories = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
  "duplicate",
] as const

export type StatusCategory = (typeof statusCategories)[number]

export const sessionStates = [
  "pending",
  "active",
  "error",
  "awaitingInput",
  "complete",
  "stale",
] as const

export type SessionState = (typeof sessionStates)[number]

export const activityTypes = [
  "thought",
  "action",
  "elicitation",
  "response",
  "error",
  "prompt",
] as const

export type ActivityType = (typeof activityTypes)[number]

export const priorities = ["none", "low", "medium", "high", "urgent"] as const

export type Priority = (typeof priorities)[number]

export const userKinds = ["human", "agent"] as const

export type UserKind = (typeof userKinds)[number]

export const DEMO_EMAIL = "demo@issue-lane.app"
export const DEMO_PASSWORD = "lane-demo"
export const AGENT_NAME = "Triage"
export const SESSION_COOKIE = "lane_session"

export const priorityMeta: Record<Priority, { label: string; color: string }> = {
  none: { label: "None", color: "#8A8F98" },
  low: { label: "Low", color: "#6B7280" },
  medium: { label: "Medium", color: "#F5A623" },
  high: { label: "High", color: "#F2994A" },
  urgent: { label: "Urgent", color: "#E5484D" },
}

export const sessionStateLabel: Record<SessionState, string> = {
  pending: "Pending",
  active: "Active",
  error: "Error",
  awaitingInput: "Awaiting input",
  complete: "Complete",
  stale: "Stale",
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`)
}

export function isStatusCategory(value: string): value is StatusCategory {
  return statusCategories.some((category) => category === value)
}

export function isSessionState(value: string): value is SessionState {
  return sessionStates.some((state) => state === value)
}

export function isActivityType(value: string): value is ActivityType {
  return activityTypes.some((type) => type === value)
}

export function isPriority(value: string): value is Priority {
  return priorities.some((priority) => priority === value)
}

export function isUserKind(value: string): value is UserKind {
  return userKinds.some((kind) => kind === value)
}

export function stateForActivity(type: ActivityType): Exclude<SessionState, "pending" | "stale"> {
  switch (type) {
    case "thought":
    case "action":
    case "prompt":
      return "active"
    case "elicitation":
      return "awaitingInput"
    case "response":
      return "complete"
    case "error":
      return "error"
    default:
      return assertNever(type)
  }
}

export function issueIdentifier(teamKey: string, number: number) {
  return `${teamKey}-${number}`
}

export function parseIdentifier(identifier: string) {
  const match = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/.exec(identifier)
  if (!match) return null
  return { key: match[1].toUpperCase(), number: Number(match[2]) }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

export function mentionsAgent(body: string, agentName: string) {
  const escaped = agentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|\\s)@(?:triage|${escaped})\\b`, "i").test(body)
}

export function needsClarification(description: string) {
  const text = description.trim()
  if (text.length < 120) return true
  return /\b(not sure|unsure|tbd|unclear|somehow|idk)\b/i.test(text)
}

export function priorityFromText(text: string): Priority {
  if (/\b(urgent|asap|blocker|sev-?1)\b/i.test(text)) return "urgent"
  if (/\b(high|launch|today)\b/i.test(text)) return "high"
  if (/\blow\b/i.test(text)) return "low"
  return "medium"
}
