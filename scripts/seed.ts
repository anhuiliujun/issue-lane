import { sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  comments,
  issueLabels,
  issues,
  labels,
  projects,
  teams,
  users,
  workflowStatuses,
  workspaces,
} from "@/lib/db/schema"
import { AGENT_NAME, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/domain"
import { hashPassword } from "@/lib/password"

const clearDescription = `A new workspace should walk a person through three concrete steps before they land on the board.

- Create the workspace and the single team
- Invite one teammate
- Create the first issue from the command menu

Done means each step has its own screen, the person can go back, and the board no longer shows sample issues when they finish.`

async function main() {
  await db.execute(sql`
    TRUNCATE TABLE
      agent_activities,
      agent_sessions,
      comments,
      issue_labels,
      issues,
      labels,
      projects,
      workflow_statuses,
      auth_sessions,
      users,
      teams,
      workspaces
    RESTART IDENTITY CASCADE
  `)

  const [workspace] = await db.insert(workspaces).values({
    name: "Issue Lane",
    slug: "issue-lane",
  }).returning()

  const [team] = await db.insert(teams).values({
    workspaceId: workspace.id,
    name: "Lane",
    key: "LANE",
  }).returning()

  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const [alex, sam, triage] = await db.insert(users).values([
    {
      workspaceId: workspace.id,
      name: "Alex Rivera",
      email: DEMO_EMAIL,
      kind: "human",
      passwordHash,
    },
    {
      workspaceId: workspace.id,
      name: "Sam Okonkwo",
      email: "sam@issue-lane.app",
      kind: "human",
    },
    {
      workspaceId: workspace.id,
      name: AGENT_NAME,
      kind: "agent",
    },
  ]).returning()

  const statusRows = await db.insert(workflowStatuses).values([
    { teamId: team.id, name: "Triage", category: "triage", position: 0, color: "#F5A623" },
    { teamId: team.id, name: "Backlog", category: "backlog", position: 1, color: "#8A8F98" },
    { teamId: team.id, name: "Todo", category: "unstarted", position: 2, color: "#5E6AD2" },
    { teamId: team.id, name: "In Progress", category: "started", position: 3, color: "#26B5CE" },
    { teamId: team.id, name: "Done", category: "completed", position: 4, color: "#4CB782" },
    { teamId: team.id, name: "Canceled", category: "canceled", position: 5, color: "#8A8F98" },
  ]).returning()
  const status = Object.fromEntries(statusRows.map((row) => [row.name, row]))

  const labelRows = await db.insert(labels).values([
    { teamId: team.id, name: "Bug", color: "#E5484D" },
    { teamId: team.id, name: "Feature", color: "#5E6AD2" },
    { teamId: team.id, name: "Improvement", color: "#4CB782" },
  ]).returning()
  const label = Object.fromEntries(labelRows.map((row) => [row.name, row]))

  const [project] = await db.insert(projects).values({
    teamId: team.id,
    name: "Interview slice",
    summary: "One team, a board, and a triage agent for the demo.",
    status: "started",
    leadId: alex.id,
    targetDate: "2026-11-14",
  }).returning()

  const issueRows = await db.insert(issues).values([
    {
      teamId: team.id,
      number: 1,
      title: "Seed the demo workspace",
      description: "A signed-in person should land on a board that already has work in every status.",
      statusId: status.Done.id,
      priority: "none",
      assigneeId: alex.id,
      projectId: project.id,
    },
    {
      teamId: team.id,
      number: 2,
      title: "Keep list rows on one line",
      description: "Titles should truncate instead of wrapping, including on a 1280px window.",
      statusId: status["In Progress"].id,
      priority: "high",
      assigneeId: sam.id,
      projectId: project.id,
    },
    {
      teamId: team.id,
      number: 3,
      title: "Expose agent activity on the issue",
      description: "The issue page shows the latest session, including thought, question, and response.",
      statusId: status.Todo.id,
      priority: "medium",
      assigneeId: alex.id,
      projectId: project.id,
    },
    {
      teamId: team.id,
      number: 4,
      title: "Remember board scroll position",
      description: "Coming back from an issue should leave the board where it was.",
      statusId: status.Backlog.id,
      priority: "low",
      projectId: project.id,
    },
    {
      teamId: team.id,
      number: 5,
      title: "Import issues from a spreadsheet",
      description: "Dropped. The demo does not need a spreadsheet import.",
      statusId: status.Canceled.id,
      priority: "none",
    },
    {
      teamId: team.id,
      number: 6,
      title: "Split account setup into three steps",
      description: clearDescription,
      statusId: status.Triage.id,
      priority: "none",
      projectId: project.id,
    },
    {
      teamId: team.id,
      number: 7,
      title: "Make the empty state better",
      description: "Not sure what it should say.",
      statusId: status.Triage.id,
      priority: "none",
    },
  ]).returning()

  const byNumber = Object.fromEntries(issueRows.map((row) => [row.number, row]))
  await db.insert(issues).values({
    teamId: team.id,
    number: 8,
    title: "Match the hover color on list rows",
    description: "The hover should use the same hairline highlight as the board cards.",
    statusId: status.Todo.id,
    priority: "low",
    assigneeId: sam.id,
    projectId: project.id,
    parentId: byNumber[2].id,
  })

  await db.insert(issueLabels).values([
    { issueId: byNumber[1].id, labelId: label.Improvement.id },
    { issueId: byNumber[2].id, labelId: label.Feature.id },
    { issueId: byNumber[3].id, labelId: label.Feature.id },
    { issueId: byNumber[4].id, labelId: label.Improvement.id },
    { issueId: byNumber[5].id, labelId: label.Bug.id },
    { issueId: byNumber[6].id, labelId: label.Feature.id },
    { issueId: byNumber[7].id, labelId: label.Improvement.id },
  ])

  await db.insert(comments).values([
    {
      issueId: byNumber[2].id,
      authorId: sam.id,
      body: "The title still wraps on a 1280px window.",
    },
    {
      issueId: byNumber[6].id,
      authorId: alex.id,
      body: "The three steps are the whole job. No extra settings screen.",
    },
  ])

  console.log(`Seeded ${workspace.name}. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}. Agent: ${triage.name}.`)
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
