import Link from 'next/link'
import { searchPages, getCourses, getCities, getFeeRanges, getExamTypes } from '../lib/api'
import OptimizedHero from '../components/OptimizedHero'
import DiscoveryFeed from '../components/discovery-feed'
import Button from '../components/ui/Button'
import type { Page } from '../lib/types'

type SearchParamsInput = { [key: string]: string | string[] | undefined }
type DiscoveryModel = {
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

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

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

export default async function Home({ searchParams }: { searchParams?: Promise<SearchParamsInput> }) {
  const resolvedSearchParams = (await searchParams) || {}
  const page = Math.max(1, parseInt(firstValue(resolvedSearchParams.page) || '1', 10) || 1)

  const currentFilters = {
    q: firstValue(resolvedSearchParams.q),
    course: firstValue(resolvedSearchParams.course),
    city: firstValue(resolvedSearchParams.city),
    fee_range: firstValue(resolvedSearchParams.fee_range),
    exam_type: firstValue(resolvedSearchParams.exam_type),
  }

  const [pagesData, courses, cities, feeRanges, examTypes] = await Promise.all([
    searchPages({
      q: currentFilters.q,
      course: currentFilters.course,
      city: currentFilters.city,
      fee_range: currentFilters.fee_range,
      exam_type: currentFilters.exam_type,
      page,
      limit: 24,
    }),
    getCourses(),
    getCities(),
    getFeeRanges(),
    getExamTypes(),
  ])

  const totalPages = Math.max(1, Math.ceil(pagesData.count / 24))
  const currentPage = Math.min(page, totalPages)
  const discoveryCards = pagesData.data.map((record, index) => toDiscoveryModel(record, index))

  const buildUrl = (p: number) => {
    const params = new URLSearchParams()
    Object.entries(resolvedSearchParams).forEach(([k, v]) => {
      const value = firstValue(v)
      if (value && k !== 'page') params.set(k, value)
    })
    params.set('page', String(Math.max(1, p)))
    return `/?${params.toString()}`
  }

  return (
    <>
      <OptimizedHero
        courses={courses}
        cities={cities}
        feeRanges={feeRanges}
        examTypes={examTypes}
        initialFilters={currentFilters}
      />

      <DiscoveryFeed
        initialCards={discoveryCards}
        initialCount={pagesData.count}
        filters={currentFilters}
        page={currentPage}
        pageSize={24}
      />

      {totalPages > 1 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#e5e5e5] pt-6">
            <Link href={buildUrl(currentPage - 1)} aria-disabled={currentPage <= 1}>
              <Button
                disabled={currentPage <= 1}
                variant="secondary"
                className="h-11 rounded-xl border-[#14213d] px-5 text-[#14213d]"
              >
                Previous
              </Button>
            </Link>
            <span className="text-sm font-semibold text-[#666666]">
              Page {currentPage} of {totalPages}
            </span>
            <Link href={buildUrl(currentPage + 1)} aria-disabled={currentPage >= totalPages}>
              <Button
                disabled={currentPage >= totalPages}
                variant="secondary"
                className="h-11 rounded-xl border-[#14213d] px-5 text-[#14213d]"
              >
                Next
              </Button>
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
