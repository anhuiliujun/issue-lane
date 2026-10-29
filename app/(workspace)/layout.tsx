import { Suspense } from "react"
import { redirect } from "next/navigation"

import { WorkspaceShell } from "@/components/workspace-shell"
import { getCurrentUser } from "@/lib/auth"
import { getTeam, listLabels, listProjects, listStatuses, listUsers } from "@/lib/repo"

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <WorkspaceFrame>{children}</WorkspaceFrame>
    </Suspense>
  )
}

async function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const [team, statuses, users, projects, labels] = await Promise.all([
    getTeam(),
    listStatuses(),
    listUsers(),
    listProjects(),
    listLabels(),
  ])
  return (
    <WorkspaceShell
      team={{ name: team.name, key: team.key }}
      statuses={statuses}
      users={users.filter((person) => person.kind === "human")}
      projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      labels={labels}
      currentUser={{ id: user.id, name: user.name }}
    >
      {children}
    </WorkspaceShell>
  )
}
