import Link from "next/link"

import { cn } from "@/lib/utils"

export function IssuesHeader({ view }: { view: "board" | "list" }) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-3">
        <h1 className="font-medium">Issues</h1>
        <div className="flex rounded-md border bg-card p-0.5">
          <ViewLink href="/board" active={view === "board"}>Board</ViewLink>
          <ViewLink href="/list" active={view === "list"}>List</ViewLink>
        </div>
      </div>
      <p className="text-muted-foreground">Ctrl K to create or update an issue</p>
    </header>
  )
}

function ViewLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[4px] px-2 py-0.5 text-[12px]",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  )
}
