import Link from "next/link"
import { notFound } from "next/navigation"

import { getProject } from "@/lib/repo"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getProject(id)
  if (!result) notFound()
  const { project, issues } = result
  return (
    <>
      <header className="border-b px-4 py-3">
        <p className="text-[12px] text-muted-foreground">Project · {project.status}</p>
        <h1 className="font-medium">{project.name}</h1>
        {project.summary ? <p className="mt-1 max-w-2xl text-muted-foreground">{project.summary}</p> : null}
        <p className="mt-2 text-[12px] text-muted-foreground">
          {project.lead ? `Lead ${project.lead.name}` : "No lead"}
          {project.targetDate ? ` · Target ${project.targetDate}` : ""}
        </p>
      </header>
      <ul className="divide-y">
        {issues.map((issue) => (
          <li key={issue.id}>
            <Link href={`/issues/${issue.identifier}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60">
              <span className="font-mono text-[12px] text-muted-foreground">{issue.identifier}</span>
              <span className="truncate">{issue.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
