import { Board } from "@/components/board"
import { matchesIssueFilter, parseIssueFilter, visibleStatuses } from "@/lib/issue-filter"
import { listIssues, listStatuses } from "@/lib/repo"

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filter = parseIssueFilter(await searchParams)
  const [issues, statuses] = await Promise.all([listIssues(), listStatuses()])
  return (
    <Board
      issues={issues.filter((issue) => matchesIssueFilter(issue, filter))}
      statuses={visibleStatuses(statuses, filter)}
    />
  )
}
