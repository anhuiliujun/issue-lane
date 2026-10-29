"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import {
  parseIssueFilter,
  withIssueFilter,
  type IssueFilter,
} from "@/lib/issue-filter"

export function useSharedIssueFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const filter = useMemo(() => parseIssueFilter(searchParams), [searchParams])

  const href = useCallback((path: string) => withIssueFilter(path, filter), [filter])

  const apply = useCallback((next: IssueFilter) => {
    const path = pathname.startsWith("/list") ? "/list" : "/board"
    router.replace(withIssueFilter(path, next))
  }, [pathname, router])

  return { filter, href, apply }
}
