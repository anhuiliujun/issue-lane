"use client"

import Link from "next/link"

import { IssueFilterBar } from "@/components/issue-filters"
import { useSharedIssueFilter } from "@/components/use-issue-filter"
import { cn } from "@/lib/utils"

export function IssuesHeader({ view }: { view: "board" | "list" }) {
  const { href } = useSharedIssueFilter()
  return (
    <header className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
      <div className="flex items-center gap-3">
        <h1 className="font-medium">Issues</h1>
        <div className="flex rounded-md border bg-card p-0.5">
          <ViewLink href={href("/board")} active={view === "board"}>Board</ViewLink>
          <ViewLink href={href("/list")} active={view === "list"}>List</ViewLink>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <IssueFilterBar />
        <p className="text-muted-foreground">C to create. Ctrl K for commands.</p>
      </div>
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
