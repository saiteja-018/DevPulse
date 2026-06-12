'use client'

import { useState, useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SubmissionCard } from './SubmissionCard'
import { SubmissionStatus, DifficultyTag } from '@prisma/client'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'

type Submission = {
  id: string
  title: string
  description: string
  language: string
  status: SubmissionStatus
  difficultyTag: DifficultyTag
  viewCount: number
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    reputation: number
  }
  _count: { reviews: number; votes: number }
  tags: Array<{ id: string; name: string; color: string }>
  userVote: 'UPVOTE' | 'DOWNVOTE' | null
}

type ActiveFilters = {
  status: string
  language: string
  difficulty: string
  sort: string
  tag: string
}

type Props = {
  initialSubmissions: Submission[]
  initialTotal: number
  initialPage: number
  limit: number
  activeFilters: ActiveFilters
  currentUserId: string | null
}

async function fetchSubmissions(
  page: number,
  limit: number,
  filters: ActiveFilters,
): Promise<{ submissions: Submission[]; meta: { hasNextPage: boolean; total: number } }> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (filters.status) params.set('status', filters.status)
  if (filters.language) params.set('language', filters.language)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.tag) params.set('tag', filters.tag)

  const res = await fetch(`/api/submissions?${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch submissions')
  const data = await res.json()
  return {
    submissions: data.data.submissions,
    meta: { hasNextPage: data.meta.hasNextPage, total: data.meta.total },
  }
}

export function SubmissionFeed({
  initialSubmissions,
  initialTotal,
  limit,
  activeFilters,
  currentUserId,
}: Props) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(activeFilters)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['submissions', filters],
    queryFn: ({ pageParam = 1 }) => fetchSubmissions(pageParam as number, limit, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.meta.hasNextPage ? pages.length + 1 : undefined,
    initialData:
      filters === activeFilters
        ? {
            pages: [{ submissions: initialSubmissions, meta: { hasNextPage: initialTotal > limit, total: initialTotal } }],
            pageParams: [1],
          }
        : undefined,
  })

  // Vote mutation with optimistic updates
  const voteMutation = useMutation({
    mutationFn: async ({ submissionId, voteType }: { submissionId: string; voteType: 'UPVOTE' | 'DOWNVOTE' }) => {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, voteType }),
      })
      if (!res.ok) throw new Error('Vote failed')
      return res.json()
    },
    onMutate: async ({ submissionId, voteType }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['submissions', filters] })
      const snapshot = queryClient.getQueryData(['submissions', filters])

      queryClient.setQueryData(['submissions', filters], (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            submissions: page.submissions.map((sub: Submission) => {
              if (sub.id !== submissionId) return sub
              const sameVote = sub.userVote === voteType
              return {
                ...sub,
                userVote: sameVote ? null : voteType,
                _count: {
                  ...sub._count,
                  votes: sameVote ? sub._count.votes - 1 : sub._count.votes + 1,
                },
              }
            }),
          })),
        }
      })

      return { snapshot }
    },
    onError: (_, __, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(['submissions', filters], context.snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', filters] })
    },
  })

  const allSubmissions = data?.pages.flatMap((p) => p.submissions) ?? []

  const updateFilter = useCallback((key: keyof ActiveFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          id="filter-language"
          value={filters.language}
          onChange={(e) => updateFilter('language', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Languages</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        <select
          id="filter-difficulty"
          value={filters.difficulty}
          onChange={(e) => updateFilter('difficulty', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Difficulties</option>
          {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          {['PENDING', 'UNDER_REVIEW', 'REVIEWED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        <select
          id="filter-sort"
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_voted">Most Voted</option>
          <option value="most_reviewed">Most Reviewed</option>
        </select>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : allSubmissions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📭</div>
          <p>No submissions found matching your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allSubmissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              currentUserId={currentUserId}
              onVote={(voteType) =>
                voteMutation.mutate({ submissionId: submission.id, voteType })
              }
            />
          ))}

          {/* Load More */}
          {hasNextPage && (
            <button
              id="load-more-btn"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-3 mt-4 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load more submissions'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
