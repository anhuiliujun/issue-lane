import { Suspense } from "react"
import { redirect } from "next/navigation"

import { WorkspaceShell } from "@/components/workspace-shell"
import { getCurrentUser } from "@/lib/auth"
import { getTeam, listStatuses, listUsers } from "@/lib/repo"

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
  const [team, statuses, users] = await Promise.all([getTeam(), listStatuses(), listUsers()])
  return (
    <WorkspaceShell
      team={{ name: team.name, key: team.key }}
      statuses={statuses}
      users={users}
      currentUser={{ id: user.id, name: user.name }}
    >
      {children}
    </WorkspaceShell>
  )
}
