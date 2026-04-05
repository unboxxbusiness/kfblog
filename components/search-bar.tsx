'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { BookOpenCheck, IndianRupee, Landmark, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import Button from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import Skeleton from './ui/Skeleton'
import FilterDrawer from './filter-drawer'
import { supabase } from '../lib/supabase'

type Filters = {
  q: string
  course: string
  city: string
  fee_range: string
  exam_type: string
}

type SearchBarProps = {
  courses: string[]
  cities: string[]
  feeRanges: string[]
  examTypes: string[]
  initialFilters: Filters
}

type Suggestion = {
  slug: string
  title: string
  subtitle: string
}

const SUGGESTION_DEBOUNCE_MS = 320

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

function sanitizeInput(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function toOption(items: string[]) {
  return items.map((item) => ({ label: item, value: item }))
}

function extractSearchTerms(value: string): string[] {
  const safe = sanitizeInput(value)
  if (!safe) return []

  const terms = safe
    .toLowerCase()
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))

  return Array.from(new Set(terms)).slice(0, 8)
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findBestMatch(query: string, options: string[]): string {
  const normalizedQuery = normalizeForMatch(query)
  if (!normalizedQuery) return ''

  let bestMatch = ''
  let bestLength = 0

  for (const option of options) {
    const normalizedOption = normalizeForMatch(option)
    if (!normalizedOption) continue

    if (normalizedQuery.includes(normalizedOption) && normalizedOption.length > bestLength) {
      bestMatch = option
      bestLength = normalizedOption.length
    }
  }

  return bestMatch
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  )
}

export default function SearchBar({
  courses,
  cities,
  feeRanges,
  examTypes,
  initialFilters,
}: SearchBarProps) {
  const router = useRouter()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const [query, setQuery] = React.useState(initialFilters.q || '')
  const [course, setCourse] = React.useState(initialFilters.course || '')
  const [city, setCity] = React.useState(initialFilters.city || '')
  const [feeRange, setFeeRange] = React.useState(initialFilters.fee_range || '')
  const [examType, setExamType] = React.useState(initialFilters.exam_type || '')

  const [liveCourses, setLiveCourses] = React.useState(courses)
  const [liveCities, setLiveCities] = React.useState(cities)
  const [liveFeeRanges, setLiveFeeRanges] = React.useState(feeRanges)
  const [liveExamTypes, setLiveExamTypes] = React.useState(examTypes)

  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false)
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])

  const courseOptions = React.useMemo(() => toOption(liveCourses), [liveCourses])
  const cityOptions = React.useMemo(() => toOption(liveCities), [liveCities])
  const feeOptions = React.useMemo(() => toOption(liveFeeRanges), [liveFeeRanges])
  const examOptions = React.useMemo(() => toOption(liveExamTypes), [liveExamTypes])

  const applySearch = React.useCallback(
    (nextQuery?: string) => {
      const params = new URLSearchParams()
      const safeQuery = sanitizeInput(String(nextQuery ?? query))

      const derivedCourse = course || findBestMatch(safeQuery, liveCourses)
      const derivedCity = city || findBestMatch(safeQuery, liveCities)
      const derivedFeeRange = feeRange || findBestMatch(safeQuery, liveFeeRanges)
      const derivedExamType = examType || findBestMatch(safeQuery, liveExamTypes)

      if (safeQuery) params.set('q', safeQuery)
      if (derivedCourse) params.set('course', derivedCourse)
      if (derivedCity) params.set('city', derivedCity)
      if (derivedFeeRange) params.set('fee_range', derivedFeeRange)
      if (derivedExamType) params.set('exam_type', derivedExamType)

      const queryString = params.toString()
      startTransition(() => {
        router.push(queryString ? `/?${queryString}` : '/')
      })
    },
    [query, course, city, feeRange, examType, liveCourses, liveCities, liveFeeRanges, liveExamTypes, router, startTransition]
  )

  const resetFilters = React.useCallback(() => {
    setQuery('')
    setCourse('')
    setCity('')
    setFeeRange('')
    setExamType('')
    setShowSuggestions(false)
    setSuggestions([])
    startTransition(() => {
      router.push('/')
    })
  }, [router, startTransition])

  const fetchSuggestions = React.useCallback(async (value: string) => {
    const safeQuery = sanitizeInput(value)
    const terms = extractSearchTerms(safeQuery)
    if (terms.length < 1) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    setSuggestionsLoading(true)

    try {
      const { data, error } = await supabase
        .from('pages')
        .select('slug, page_title, course, city')
        .eq('published', true)
        .or(
          terms
            .flatMap((term) => [`page_title.ilike.%${term}%`, `course.ilike.%${term}%`, `city.ilike.%${term}%`])
            .join(',')
        )
        .order('created_at', { ascending: false })
        .limit(8)

      if (error) {
        setSuggestions([])
        return
      }

      const nextSuggestions = (data || []).map((row: any) => {
        const title = String(row.page_title || row.slug || 'College')
        const courseLabel = String(row.course || 'General stream')
        const cityLabel = String(row.city || 'India')

        return {
          slug: String(row.slug || ''),
          title,
          subtitle: `${courseLabel} • ${cityLabel}`,
        }
      })

      setSuggestions(nextSuggestions.filter((item) => item.slug).slice(0, 8))
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  const syncFilterOptions = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('course, city, fee_range, exam_type')
      .eq('published', true)
      .limit(2000)

    if (error || !data) return

    setLiveCourses(uniqueSorted(data.map((row: any) => row.course)))
    setLiveCities(uniqueSorted(data.map((row: any) => row.city)))
    setLiveFeeRanges(uniqueSorted(data.map((row: any) => row.fee_range)))
    setLiveExamTypes(uniqueSorted(data.map((row: any) => row.exam_type)))
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, SUGGESTION_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query])

  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    void fetchSuggestions(debouncedQuery)
  }, [debouncedQuery, fetchSuggestions])

  React.useEffect(() => {
    if (sanitizeInput(debouncedQuery).length < 2) return

    const channel = supabase
      .channel(`kf-search-suggestions-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        void fetchSuggestions(debouncedQuery)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [debouncedQuery, fetchSuggestions])

  React.useEffect(() => {
    void syncFilterOptions()

    const channel = supabase
      .channel(`kf-search-filters-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        void syncFilterOptions()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [syncFilterOptions])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <>
      <div ref={rootRef} className="relative rounded-2xl border border-[#e5e5e5] bg-white p-2.5 shadow-[0_10px_24px_rgba(20,33,61,0.12)] sm:p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  setShowSuggestions(false)
                  applySearch()
                }
              }}
              placeholder="Search colleges, courses, cities"
              className="h-12 rounded-xl border-[#e5e5e5] pl-9 text-sm text-[#333333] placeholder:text-[#666666]"
            />
          </div>

          <Button
            type="button"
            onClick={() => {
              setShowSuggestions(false)
              applySearch()
            }}
            disabled={isPending}
            className="h-12 w-full rounded-xl bg-[#fca311] px-4 font-semibold text-white hover:bg-[#d68502] sm:min-w-[140px] sm:w-auto"
          >
            {isPending ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {showSuggestions && sanitizeInput(query).length >= 2 && (
          <div className="absolute left-3 right-3 top-[calc(100%-2px)] z-40 overflow-hidden rounded-b-2xl border border-t-0 border-[#e5e5e5] bg-white shadow-[0_12px_24px_rgba(20,33,61,0.12)]">
            {suggestionsLoading && (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            )}

            {!suggestionsLoading && suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-[#666666]">No suggestions yet. Try another keyword.</div>
            )}

            {!suggestionsLoading &&
              suggestions.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setQuery(item.title)
                    setShowSuggestions(false)
                    applySearch(item.title)
                  }}
                  className="w-full border-b border-[#f2f2f2] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#fafafa]"
                >
                  <p className="text-sm font-semibold text-[#000000]">{item.title}</p>
                  <p className="text-xs text-[#666666]">{item.subtitle}</p>
                </button>
              ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMobileFilterOpen(true)}
            className="h-11 rounded-xl border-[#14213d]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button type="button" variant="secondary" onClick={resetFilters} className="h-11 rounded-xl border-[#14213d]">
            Reset
          </Button>
        </div>

        <div className="mt-3 hidden grid-cols-4 gap-2 md:grid">
          <div className="relative">
            <BookOpenCheck className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#666666]" />
            <Select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              options={courseOptions}
              placeholder="Course"
              className="h-11 rounded-xl border-[#e5e5e5] pl-9"
            />
          </div>

          <div className="relative">
            <Landmark className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#666666]" />
            <Select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              options={cityOptions}
              placeholder="City"
              className="h-11 rounded-xl border-[#e5e5e5] pl-9"
            />
          </div>

          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#666666]" />
            <Select
              value={feeRange}
              onChange={(event) => setFeeRange(event.target.value)}
              options={feeOptions}
              placeholder="Fee range"
              className="h-11 rounded-xl border-[#e5e5e5] pl-9"
            />
          </div>

          <div className="relative">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#666666]" />
            <Select
              value={examType}
              onChange={(event) => setExamType(event.target.value)}
              options={examOptions}
              placeholder="Exam"
              className="h-11 rounded-xl border-[#e5e5e5] pl-9"
            />
          </div>
        </div>

        <div className="mt-3 hidden items-center gap-2 md:flex">
          <Button
            type="button"
            onClick={() => {
              setShowSuggestions(false)
              applySearch()
            }}
            disabled={isPending}
            className="h-11 rounded-xl bg-[#fca311] px-6 text-white hover:bg-[#d68502]"
          >
            {isPending ? 'Applying...' : 'Apply Filters'}
          </Button>
          <Button type="button" variant="secondary" onClick={resetFilters} className="h-11 rounded-xl border-[#14213d]">
            Reset
          </Button>
        </div>
      </div>

      <FilterDrawer
        open={mobileFilterOpen}
        onOpenChange={setMobileFilterOpen}
        values={{
          course,
          city,
          fee_range: feeRange,
          exam_type: examType,
        }}
        onValueChange={(field, value) => {
          if (field === 'course') setCourse(value)
          if (field === 'city') setCity(value)
          if (field === 'fee_range') setFeeRange(value)
          if (field === 'exam_type') setExamType(value)
        }}
        courses={liveCourses}
        cities={liveCities}
        feeRanges={liveFeeRanges}
        examTypes={liveExamTypes}
        onApply={() => {
          setShowSuggestions(false)
          applySearch()
        }}
        onReset={resetFilters}
      />
    </>
  )
}
