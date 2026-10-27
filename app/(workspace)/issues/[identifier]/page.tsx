import { notFound } from "next/navigation"

import { IssueScreen } from "@/components/issue-screen"
import { parseIdentifier } from "@/lib/domain"
import { getIssueByNumber, listStatuses, listUsers } from "@/lib/repo"

export default async function IssuePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const parsed = parseIdentifier(identifier)
  if (!parsed) notFound()
  const [issue, statuses, users] = await Promise.all([
    getIssueByNumber(parsed.number),
    listStatuses(),
    listUsers(),
  ])
  if (!issue || issue.identifier !== `${parsed.key}-${parsed.number}`) notFound()
  return <IssueScreen issue={issue} statuses={statuses} users={users} />
}
