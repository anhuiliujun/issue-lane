import { IssueList } from "@/components/issue-list"
import { matchesIssueFilter, parseIssueFilter } from "@/lib/issue-filter"
import { listIssues, listStatuses } from "@/lib/repo"

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filter = parseIssueFilter(await searchParams)
  const [issues, statuses] = await Promise.all([listIssues(), listStatuses()])
  return (
    <IssueList
      issues={issues.filter((issue) => matchesIssueFilter(issue, filter))}
      statuses={statuses}
    />
  )
}
