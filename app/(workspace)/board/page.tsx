import { Board } from "@/components/board"
import { listIssues, listStatuses } from "@/lib/repo"

export default async function BoardPage() {
  const [issues, statuses] = await Promise.all([listIssues(), listStatuses()])
  return <Board issues={issues} statuses={statuses} />
}
