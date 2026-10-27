import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials, priorityMeta, type Priority, type UserKind } from "@/lib/domain"

const avatarColors = ["#5E6AD2", "#4CB782", "#F2994A", "#26B5CE", "#E5484D"]

function colorFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash + char.charCodeAt(0)) % avatarColors.length
  return avatarColors[hash] ?? avatarColors[0]
}

export function PriorityMark({ priority }: { priority: Priority }) {
  const meta = priorityMeta[priority]
  return (
    <span className="inline-flex items-center gap-1.5" title={meta.label}>
      <span className="size-2 rounded-[2px]" style={{ backgroundColor: meta.color }} />
      <span className="sr-only">{meta.label}</span>
    </span>
  )
}

export function UserChip({
  name,
  kind = "human",
  label = true,
}: {
  name: string
  kind?: UserKind
  label?: boolean
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar size="sm" className="size-5" title={kind === "agent" ? `${name}, agent` : name}>
        <AvatarFallback
          className="text-[9px] text-white"
          style={{ backgroundColor: kind === "agent" ? "#222326" : colorFor(name) }}
        >
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {label ? <span className="truncate">{name}</span> : null}
    </span>
  )
}
