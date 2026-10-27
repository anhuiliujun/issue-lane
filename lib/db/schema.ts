import { relations } from "drizzle-orm"
import {
  type AnyPgColumn,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Tables follow the concepts this version actually uses.
 * Status category `duplicate` and session state `stale` are reserved and not seeded.
 * Workflow status is a row, not a Postgres enum.
 */

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)])

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("teams_workspace_key_unique").on(table.workspaceId, table.key)])

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  kind: text("kind").notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)])

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [uniqueIndex("auth_sessions_token_unique").on(table.tokenHash)])

export const workflowStatuses = pgTable("workflow_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  position: integer("position").notNull(),
  color: text("color").notNull(),
}, (table) => [
  uniqueIndex("workflow_statuses_team_name_unique").on(table.teamId, table.name),
  index("workflow_statuses_team_position").on(table.teamId, table.position),
])

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
  status: text("status").notNull().default("planned"),
  leadId: uuid("lead_id").references(() => users.id, { onDelete: "set null" }),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
})

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
}, (table) => [uniqueIndex("labels_team_name_unique").on(table.teamId, table.name)])

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  statusId: uuid("status_id").notNull().references(() => workflowStatuses.id),
  priority: text("priority").notNull().default("none"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => issues.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("issues_team_number_unique").on(table.teamId, table.number),
  index("issues_status").on(table.statusId),
  index("issues_assignee").on(table.assigneeId),
  index("issues_project").on(table.projectId),
  index("issues_parent").on(table.parentId),
])

export const issueLabels = pgTable("issue_labels", {
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.issueId, table.labelId] })])

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [index("comments_issue_created").on(table.issueId, table.createdAt)])

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  agentUserId: uuid("agent_user_id").notNull().references(() => users.id),
  state: text("state").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [index("agent_sessions_issue_created").on(table.issueId, table.createdAt)])

export const agentActivities = pgTable("agent_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => agentSessions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  body: text("body").notNull().default(""),
  actionName: text("action_name"),
  actionParams: jsonb("action_params").$type<Record<string, unknown> | null>(),
  actionResult: jsonb("action_result").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [index("agent_activities_session_created").on(table.sessionId, table.createdAt)])

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  teams: many(teams),
  users: many(users),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [teams.workspaceId], references: [workspaces.id] }),
  statuses: many(workflowStatuses),
  projects: many(projects),
  labels: many(labels),
  issues: many(issues),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [users.workspaceId], references: [workspaces.id] }),
  authSessions: many(authSessions),
  assignedIssues: many(issues),
  comments: many(comments),
}))

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}))

export const workflowStatusesRelations = relations(workflowStatuses, ({ one, many }) => ({
  team: one(teams, { fields: [workflowStatuses.teamId], references: [teams.id] }),
  issues: many(issues),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
  lead: one(users, { fields: [projects.leadId], references: [users.id] }),
  issues: many(issues),
}))

export const labelsRelations = relations(labels, ({ one, many }) => ({
  team: one(teams, { fields: [labels.teamId], references: [teams.id] }),
  issueLabels: many(issueLabels),
}))

export const issuesRelations = relations(issues, ({ one, many }) => ({
  team: one(teams, { fields: [issues.teamId], references: [teams.id] }),
  status: one(workflowStatuses, { fields: [issues.statusId], references: [workflowStatuses.id] }),
  assignee: one(users, { fields: [issues.assigneeId], references: [users.id] }),
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  parent: one(issues, {
    fields: [issues.parentId],
    references: [issues.id],
    relationName: "issueParent",
  }),
  children: many(issues, { relationName: "issueParent" }),
  labels: many(issueLabels),
  comments: many(comments),
  sessions: many(agentSessions),
}))

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, { fields: [issueLabels.issueId], references: [issues.id] }),
  label: one(labels, { fields: [issueLabels.labelId], references: [labels.id] }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}))

export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  issue: one(issues, { fields: [agentSessions.issueId], references: [issues.id] }),
  agent: one(users, { fields: [agentSessions.agentUserId], references: [users.id] }),
  activities: many(agentActivities),
}))

export const agentActivitiesRelations = relations(agentActivities, ({ one }) => ({
  session: one(agentSessions, { fields: [agentActivities.sessionId], references: [agentSessions.id] }),
}))
