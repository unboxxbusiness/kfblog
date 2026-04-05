'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CollegeCard from '../../components/CollegeCard'
import CollegeCardSkeleton from '../../components/CollegeCardSkeleton'
import { getSearchSuggestions, searchPagesFullText } from '../../lib/api'

type Grouped = {
  exact: any[]
  sameCourseOtherCity: any[]
  sameCityOtherCourse: any[]
}

const RECENT_KEY = 'recent_searches'

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, 10) : []
  } catch {
    return []
  }
}

function pushRecentSearch(q: string) {
  const query = String(q || '').trim()
  if (!query || typeof window === 'undefined') return
  const now = getRecentSearches().filter((x) => x.toLowerCase() !== query.toLowerCase())
  const next = [query, ...now].slice(0, 10)
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function includesText(value: any, query: string) {
  return String(value || '').toLowerCase().includes(query.toLowerCase())
}

function reasonFor(page: any, query: string) {
  const c = includesText(page.course, query)
  const city = includesText(page.city, query)
  if (c && city) return 'Matches course + city'
  if (c) return 'Matches course'
  if (city) return 'Matches city'
  return 'Matches title'
}

function groupResults(rows: any[], query: string): Grouped {
  const grouped: Grouped = {
    exact: [],
    sameCourseOtherCity: [],
    sameCityOtherCourse: []
  }

  rows.forEach((page) => {
    const reason = reasonFor(page, query)
    const row = { ...page, relevanceReason: reason }
    if (reason === 'Matches course + city' || reason === 'Matches title') grouped.exact.push(row)
    else if (reason === 'Matches course') grouped.sameCourseOtherCity.push(row)
    else grouped.sameCityOtherCourse.push(row)
  })

  return grouped
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''

  const [q, setQ] = React.useState(initialQ)
  const [debouncedQ, setDebouncedQ] = React.useState(initialQ)
  const [loading, setLoading] = React.useState(false)
  const [grouped, setGrouped] = React.useState({ exact: [], sameCourseOtherCity: [], sameCityOtherCourse: [] } as Grouped)
  const [suggestions, setSuggestions] = React.useState([] as Array<{ slug: string; title: string; reason: string }>)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [recent, setRecent] = React.useState([] as string[])

  React.useEffect(() => {
    setRecent(getRecentSearches())
  }, [])

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 300)
    return () => window.clearTimeout(id)
  }, [q])

  const loadSearch = React.useCallback(async (query: string) => {
    const trimmed = String(query || '').trim()
    if (!trimmed) {
      setGrouped({ exact: [], sameCourseOtherCity: [], sameCityOtherCourse: [] })
      setSuggestions([])
      return
    }

    setLoading(true)
    const [rows, sg] = await Promise.all([
      searchPagesFullText(trimmed, 60),
      getSearchSuggestions(trimmed, 8)
    ])

    setGrouped(groupResults(rows, trimmed))
    setSuggestions(sg)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadSearch(debouncedQ)
    const trimmed = String(debouncedQ || '').trim()
    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.replace('/search')
    }
  }, [debouncedQ])

  const flatResults = React.useMemo(() => {
    return [...grouped.exact, ...grouped.sameCourseOtherCity, ...grouped.sameCityOtherCourse]
  }, [grouped])

  const handleKeyDown = (e: any) => {
    if (!flatResults.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev: number) => (prev + 1) % flatResults.length)
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev: number) => (prev <= 0 ? flatResults.length - 1 : prev - 1))
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      pushRecentSearch(q)
      setRecent(getRecentSearches())
      const target = activeIndex >= 0 ? flatResults[activeIndex] : flatResults[0]
      if (target?.slug) router.push(`/colleges/${target.slug}`)
    }
  }

  const clickRecent = (value: string) => {
    setQ(value)
    pushRecentSearch(value)
    setRecent(getRecentSearches())
  }

  const renderGroup = (title: string, rows: any[]) => {
    if (!rows.length) return null
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#000000]">{title}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((p: any, i: number) => {
            const idx = flatResults.findIndex((x: any) => x.id === p.id)
            return (
              <div key={p.id} className={idx === activeIndex ? 'ring-2 ring-[#14213d] rounded-lg' : ''}>
                <div className="mb-2 text-xs font-medium text-[#14213d]">{p.relevanceReason}</div>
                <CollegeCard page={p} />
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Advanced Search</h1>
        <p className="mt-2 text-[#666666]">Find college pages by course, city, title, and SEO content.</p>
      </header>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
        <input
          value={q}
          onChange={(e: any) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search e.g. mba pune"
          className="h-11 w-full rounded-md border border-[#e5e5e5] px-3 text-sm focus:border-[#14213d] focus:outline-none focus:ring-2 focus:ring-[#29447e]/25"
        />

        {suggestions.length > 0 && (
          <div className="mt-3 rounded-md border border-[#e5e5e5] bg-white">
            {suggestions.map((s: { slug: string; title: string; reason: string }, i: number) => (
              <button
                key={s.slug + i}
                className="flex w-full items-center justify-between border-b border-[#e5e5e5] px-3 py-2 text-left last:border-b-0 hover:bg-[#fafafa]"
                onClick={() => {
                  setQ(s.title)
                  pushRecentSearch(s.title)
                  setRecent(getRecentSearches())
                }}
              >
                <span className="text-sm text-[#000000]">{s.title}</span>
                <span className="text-xs text-[#666666]">{s.reason}</span>
              </button>
            ))}
          </div>
        )}

        {recent.length > 0 && !q && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-[#666666]">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r: string) => (
                <button key={r} onClick={() => clickRecent(r)} className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs text-[#333333] hover:bg-[#e5e5e5]">
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CollegeCardSkeleton />
          <CollegeCardSkeleton />
          <CollegeCardSkeleton />
          <CollegeCardSkeleton />
        </div>
      ) : (
        <div className="space-y-8">
          {renderGroup('Exact Match', grouped.exact)}
          {renderGroup('Same Course Other City', grouped.sameCourseOtherCity)}
          {renderGroup('Same City Other Course', grouped.sameCityOtherCourse)}
        </div>
      )}
    </main>
  )
}
