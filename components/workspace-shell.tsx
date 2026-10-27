"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserChip } from "@/components/marks"
import type { StatusDto, UserDto } from "@/lib/dto"
import { cn } from "@/lib/utils"

type SelectedIssue = { id: string; identifier: string }

type WorkspaceContextValue = {
  selected: SelectedIssue | null
  select: (issue: SelectedIssue | null) => void
  statuses: StatusDto[]
  users: UserDto[]
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error("Workspace context is missing.")
  return value
}

export function WorkspaceShell({
  team,
  statuses,
  users,
  currentUser,
  children,
}: {
  team: { name: string; key: string }
  statuses: StatusDto[]
  users: UserDto[]
  currentUser: { id: string; name: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [selected, setSelected] = useState<SelectedIssue | null>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandPage, setCommandPage] = useState<"root" | "status" | "assignee">("root")
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setCommandOpen(false)
  }
  const [createOpen, setCreateOpen] = useState(false)
  const select = useCallback((issue: SelectedIssue | null) => setSelected(issue), [])
  const context = useMemo(
    () => ({ selected, select, statuses, users }),
    [selected, select, statuses, users],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandPage("root")
        setCommandOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  async function patchIssue(body: Record<string, unknown>) {
    if (!selected) return
    const response = await fetch(`/api/issues/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error ?? "Could not update the issue.")
    setCommandOpen(false)
    if (payload.sessionId) {
      router.push(`/issues/${selected.identifier}`)
    }
    router.refresh()
  }

  const issuesActive = pathname.startsWith("/board") || pathname.startsWith("/list") || pathname.startsWith("/issues")
  const projectsActive = pathname.startsWith("/projects")

  return (
    <WorkspaceContext.Provider value={context}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside className="flex w-[220px] shrink-0 flex-col border-r bg-sidebar">
          <div className="border-b px-3 py-3">
            <p className="font-medium">{team.name}</p>
            <p className="text-[12px] text-muted-foreground">{team.key}</p>
          </div>
          <nav className="flex flex-col gap-0.5 p-2">
            <SideLink href="/board" active={issuesActive}>Issues</SideLink>
            <SideLink href="/projects" active={projectsActive}>Projects</SideLink>
          </nav>
          <div className="mt-auto border-t p-2">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <UserChip name={currentUser.name} />
              <button
                type="button"
                className="text-[12px] text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" })
                  router.push("/login")
                  router.refresh()
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <CommandDialog
        open={commandOpen}
        onOpenChange={(open) => {
          setCommandOpen(open)
          if (!open) setCommandPage("root")
        }}
        title="Command menu"
        description="Create an issue, or change status and assignee for the selected issue."
      >
        <Command>
          <CommandInput placeholder={commandPage === "root" ? "Type a command…" : "Filter…"} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            {commandPage === "root" ? (
              <CommandGroup heading="Commands">
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false)
                    setCreateOpen(true)
                  }}
                >
                  New issue
                </CommandItem>
                <CommandItem
                  disabled={!selected}
                  onSelect={() => setCommandPage("status")}
                >
                  Change status
                  <span className="ml-auto text-muted-foreground">{selected?.identifier ?? "Select an issue"}</span>
                </CommandItem>
                <CommandItem
                  disabled={!selected}
                  onSelect={() => setCommandPage("assignee")}
                >
                  Change assignee
                  <span className="ml-auto text-muted-foreground">{selected?.identifier ?? "Select an issue"}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {commandPage === "status" ? (
              <CommandGroup heading={`Status for ${selected?.identifier ?? "issue"}`}>
                <CommandItem onSelect={() => setCommandPage("root")}>Back</CommandItem>
                <CommandSeparator />
                {statuses.map((status) => (
                  <CommandItem
                    key={status.id}
                    onSelect={() => {
                      void patchIssue({ statusId: status.id }).catch((error: Error) => toast.error(error.message))
                    }}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {commandPage === "assignee" ? (
              <CommandGroup heading={`Assignee for ${selected?.identifier ?? "issue"}`}>
                <CommandItem onSelect={() => setCommandPage("root")}>Back</CommandItem>
                <CommandSeparator />
                <CommandItem
                  onSelect={() => {
                    void patchIssue({ assigneeId: null }).catch((error: Error) => toast.error(error.message))
                  }}
                >
                  No assignee
                </CommandItem>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => {
                      void patchIssue({ assigneeId: user.id }).catch((error: Error) => toast.error(error.message))
                    }}
                  >
                    {user.name}
                    {user.kind === "agent" ? <span className="text-muted-foreground">Agent</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(identifier) => {
          setCreateOpen(false)
          router.push(`/issues/${identifier}`)
          router.refresh()
        }}
      />
      <Toaster />
    </WorkspaceContext.Provider>
  )
}

function SideLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2 py-1.5",
        active ? "bg-sidebar-accent font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  )
}

function CreateIssueDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (identifier: string) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState(false)
  if (!open && (title !== "" || description !== "" || pending)) {
    setTitle("")
    setDescription("")
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>It starts in Triage.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)
            const response = await fetch("/api/issues", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ title, description }),
            })
            const payload = await response.json().catch(() => ({}))
            setPending(false)
            if (!response.ok) {
              toast.error(payload.error ?? "Could not create the issue.")
              return
            }
            onCreated(payload.identifier)
          }}
        >
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            required
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description, in Markdown"
            rows={4}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending || title.trim().length === 0}>
              {pending ? "Creating…" : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
