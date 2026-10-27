import { IssueList } from "@/components/issue-list"
import { listIssues, listStatuses } from "@/lib/repo"

export default async function ListPage() {
  const [issues, statuses] = await Promise.all([listIssues(), listStatuses()])
  return <IssueList issues={issues} statuses={statuses} />
}
