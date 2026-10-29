import { notFound } from "next/navigation"

import { IssueScreen } from "@/components/issue-screen"
import { parseIdentifier } from "@/lib/domain"
import { getIssueByNumber } from "@/lib/repo"

export default async function IssuePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const parsed = parseIdentifier(identifier)
  if (!parsed) notFound()
  const issue = await getIssueByNumber(parsed.number)
  if (!issue || issue.identifier !== `${parsed.key}-${parsed.number}`) notFound()
  return <IssueScreen issue={issue} />
}
