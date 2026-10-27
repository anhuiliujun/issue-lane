import Link from "next/link"

import { listProjects } from "@/lib/repo"

export default async function ProjectsPage() {
  const projects = await listProjects()
  return (
    <>
      <header className="flex h-11 items-center border-b px-3">
        <h1 className="font-medium">Projects</h1>
      </header>
      <ul className="divide-y">
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`} className="flex items-baseline gap-3 px-3 py-2 hover:bg-muted/60">
              <span className="font-medium">{project.name}</span>
              <span className="text-muted-foreground">{project.status}</span>
              {project.targetDate ? (
                <span className="ml-auto text-[12px] text-muted-foreground">{project.targetDate}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
