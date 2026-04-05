'use client'

import * as React from 'react'
import Link from 'next/link'
import Button from './ui/Button'
import Skeleton from './ui/Skeleton'
import DiscoveryCollegeCard from './college-card'
import VirtualList from './VirtualList'
import { supabase } from '../lib/supabase'
import type { Page } from '../lib/types'

export type DiscoveryModel = {
  slug: string
  title: string
  city: string
  course: string
  fees: string
  exam: string
  placement: number
  avgPackage: number
  admissionChance: number
  matchScore: number
  tags: string[]
}

type Filters = {
  q: string
  course: string
  city: string
  fee_range: string
  exam_type: string
}

type DiscoveryFeedProps = {
  initialCards: DiscoveryModel[]
  initialCount: number
  filters: Filters
  page: number
  pageSize: number
}

type WorkerResponse = {
  requestId: string
  cards: DiscoveryModel[]
}

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'best',
  'college',
  'colleges',
  'course',
  'courses',
  'exam',
  'exams',
  'fee',
  'fees',
  'filter',
  'for',
  'in',
  'kampus',
  'of',
  'the',
  'with',
])

function hashText(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sanitizeSearchTerm(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function extractSearchTerms(value: string): string[] {
  const safe = sanitizeSearchTerm(value)
  if (!safe) return []

  const terms = safe
    .toLowerCase()
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))

  return Array.from(new Set(terms)).slice(0, 8)
}

function buildSearchOrClause(terms: string[]): string {
  return terms
    .flatMap((term) =>
      [
        `page_title.ilike.%${term}%`,
        `h1_text.ilike.%${term}%`,
        `course.ilike.%${term}%`,
        `city.ilike.%${term}%`,
        `fee_range.ilike.%${term}%`,
        `exam_type.ilike.%${term}%`,
        `content_json->seo->>title.ilike.%${term}%`,
      ]
    )
    .join(',')
}

function toDiscoveryModel(page: Page, index: number): DiscoveryModel {
  const slug = String(page.slug || `college-${index}`)
  const seed = hashText(slug)

  const placement = clamp(68 + (seed % 29), 65, 98)
  const avgPackage = Number((3.5 + ((seed >> 3) % 95) / 10).toFixed(1))
  const admissionChance = clamp(52 + ((seed >> 6) % 41), 40, 95)
  const matchScore = clamp(70 + ((seed >> 9) % 29), 65, 98)

  const title =
    String(page.page_title || page.h1_text || slug)
      .replace(/-/g, ' ')
      .trim() || 'College Profile'

  const tags = new Set<string>()

  const type = String(page.college_type || '').toLowerCase()
  if (type.includes('gov')) tags.add('Government')
  if (type.includes('private')) tags.add('Private')
  if (placement >= 88) tags.add('Top Placement')

  return {
    slug,
    title,
    city: String(page.city || 'Pan India'),
    course: String(page.course || 'General Stream'),
    fees: String(page.fee_range || 'Talk to counselor'),
    exam: String(page.exam_type || 'No mandatory exam'),
    placement,
    avgPackage,
    admissionChance,
    matchScore,
    tags: Array.from(tags),
  }
}

export default function DiscoveryFeed({ initialCards, initialCount, filters, page, pageSize }: DiscoveryFeedProps) {
  const [, startTransition] = React.useTransition()
  const [cards, setCards] = React.useState<DiscoveryModel[]>(initialCards)
  const [count, setCount] = React.useState(initialCount)
  const [isLoading, setIsLoading] = React.useState(false)

  const syncTimer = React.useRef<number | null>(null)
  const workerRef = React.useRef<Worker | null>(null)
  const workerRequestIdRef = React.useRef<string>('')

  React.useEffect(() => {
    if (typeof Worker === 'undefined') return

    const worker = new Worker(new URL('../lib/workers/discovery-model.worker.ts', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const payload = event.data
      if (!payload || payload.requestId !== workerRequestIdRef.current) return

      startTransition(() => {
        setCards(Array.isArray(payload.cards) ? payload.cards : [])
      })
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      workerRequestIdRef.current = ''
    }
  }, [startTransition])

  const fetchSnapshot = React.useCallback(async () => {
    setIsLoading(true)

    try {
      const from = (Math.max(1, page) - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('pages')
        .select('id, slug, course, city, fee_range, exam_type, page_title, h1_text, college_type, created_at', {
          count: 'exact',
        })
        .eq('published', true)

      if (filters.course) query = query.eq('course', filters.course)
      if (filters.city) query = query.eq('city', filters.city)
      if (filters.fee_range) query = query.eq('fee_range', filters.fee_range)
      if (filters.exam_type) query = query.eq('exam_type', filters.exam_type)

      const terms = extractSearchTerms(filters.q)
      if (terms.length > 0) {
        query = query.or(buildSearchOrClause(terms))
      }

      const { data, error, count: nextCount } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
        .limit(pageSize)

      if (!error) {
        const nextRows = (data || []) as Page[]
        startTransition(() => {
          setCount(nextCount || 0)
        })

        if (workerRef.current && nextRows.length > 50) {
          const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
          workerRequestIdRef.current = requestId
          workerRef.current.postMessage({ requestId, pages: nextRows })
        } else {
          startTransition(() => {
            setCards(nextRows.map((record, index) => toDiscoveryModel(record, index)))
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [filters.city, filters.course, filters.exam_type, filters.fee_range, filters.q, page, pageSize])

  React.useEffect(() => {
    void fetchSnapshot()
  }, [fetchSnapshot])

  React.useEffect(() => {
    const channel = supabase
      .channel(`kf-discovery-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        if (syncTimer.current) {
          window.clearTimeout(syncTimer.current)
        }

        syncTimer.current = window.setTimeout(() => {
          void fetchSnapshot()
        }, 250)
      })
      .subscribe()

    return () => {
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [fetchSnapshot])

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#000000] md:text-3xl">College Results</h2>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-sm font-semibold text-[#14213d]">
          {count.toLocaleString()} results
        </div>
      </div>

      {cards.length === 0 && isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[#e5e5e5] bg-white p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="mt-4 h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center">
          <h3 className="text-xl font-semibold text-[#000000]">No colleges found for these filters</h3>
          <p className="mt-1 text-sm text-[#333333]">Try resetting one or more filters.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button className="h-11 rounded-xl bg-[#fca311] text-white hover:bg-[#d68502]">Reset Filters</Button>
          </Link>
        </div>
      ) : cards.length > 50 ? (
        <VirtualList
          items={cards}
          height={Math.min(900, Math.max(420, cards.length * 182))}
          itemHeight={184}
          className="rounded-xl border border-[#e5e5e5] bg-white p-2"
          renderItem={({ item }) => (
            <div className="p-1">
              <DiscoveryCollegeCard
                key={item.slug}
                slug={item.slug}
                title={item.title}
                city={item.city}
                course={item.course}
                fees={item.fees}
                exam={item.exam}
                placement={item.placement}
                avgPackage={item.avgPackage}
                admissionChance={item.admissionChance}
                matchScore={item.matchScore}
                tags={item.tags}
              />
            </div>
          )}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <DiscoveryCollegeCard
              key={card.slug}
              slug={card.slug}
              title={card.title}
              city={card.city}
              course={card.course}
              fees={card.fees}
              exam={card.exam}
              placement={card.placement}
              avgPackage={card.avgPackage}
              admissionChance={card.admissionChance}
              matchScore={card.matchScore}
              tags={card.tags}
            />
          ))}
        </div>
      )}
    </section>
  )
}
