import type { Page } from './types'

type InternalLinkGroup = 'sameCourse' | 'sameCity' | 'sameFeeRange' | 'hub'

export type InternalLinkItem = {
  href: string
  title: string
  placementPercent: number
  feeRange: string
  group: InternalLinkGroup
}

export type InternalLinksResult = {
  sameCourse: InternalLinkItem[]
  sameCity: InternalLinkItem[]
  sameFeeRange: InternalLinkItem[]
  hubs: InternalLinkItem[]
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function slugify(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

function getAveragePlacement(page: Page): number {
  const colleges = Array.isArray(page.content_json?.colleges) ? page.content_json?.colleges : []

  const values = colleges
    .map((college) => toFiniteNumber((college as Record<string, unknown>).placement_percent))
    .filter((value) => value > 0)

  if (values.length === 0) return 0
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length
  return Math.round(avg)
}

function getAverageValueScore(page: Page): number {
  const colleges = Array.isArray(page.content_json?.colleges) ? page.content_json?.colleges : []

  const values = colleges
    .map((college) => toFiniteNumber((college as Record<string, unknown>).value_score))
    .filter((value) => value > 0)

  if (values.length === 0) return 0
  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2))
}

function toLinkItem(page: Page, title: string, group: InternalLinkGroup): InternalLinkItem {
  return {
    href: `/colleges/${encodeURIComponent(String(page.slug || ''))}`,
    title,
    placementPercent: getAveragePlacement(page),
    feeRange: normalizeText(page.fee_range || 'N/A'),
    group,
  }
}

export function generateInternalLinks(currentPage: Page, allPages: Page[]): InternalLinksResult {
  const course = normalizeText(currentPage.course)
  const city = normalizeText(currentPage.city)
  const feeRange = normalizeText(currentPage.fee_range)
  const slug = normalizeText(currentPage.slug)

  const candidates = allPages.filter((page) => {
    const candidateSlug = normalizeText(page.slug)
    return Boolean(candidateSlug) && candidateSlug !== slug
  })

  const sameCourse = candidates
    .filter((page) => normalizeText(page.course) === course && normalizeText(page.city) !== city)
    .sort((a, b) => getAveragePlacement(b) - getAveragePlacement(a))
    .slice(0, 4)
    .map((page) => toLinkItem(page, `${normalizeText(page.course)} Colleges in ${normalizeText(page.city)}`, 'sameCourse'))

  const sameCity = candidates
    .filter((page) => normalizeText(page.city) === city && normalizeText(page.course) !== course)
    .sort((a, b) => getAverageValueScore(b) - getAverageValueScore(a))
    .slice(0, 4)
    .map((page) => toLinkItem(page, `${normalizeText(page.course)} Colleges in ${normalizeText(page.city)}`, 'sameCity'))

  const sameFeeRange = candidates
    .filter((page) => normalizeText(page.fee_range) === feeRange)
    .sort((a, b) => getAveragePlacement(b) - getAveragePlacement(a))
    .slice(0, 2)
    .map((page) => toLinkItem(page, `${normalizeText(page.course)} Colleges in ${normalizeText(page.city)}`, 'sameFeeRange'))

  const hubs: InternalLinkItem[] = [
    {
      href: `/courses/${encodeURIComponent(slugify(course))}`,
      title: `${course} Course Hub`,
      placementPercent: 0,
      feeRange: feeRange || 'N/A',
      group: 'hub',
    },
    {
      href: `/cities/${encodeURIComponent(slugify(city))}`,
      title: `${city} City Hub`,
      placementPercent: 0,
      feeRange: feeRange || 'N/A',
      group: 'hub',
    },
    {
      href: '/apply',
      title: 'Apply for Counselling',
      placementPercent: 0,
      feeRange: feeRange || 'N/A',
      group: 'hub',
    },
  ]

  return {
    sameCourse,
    sameCity,
    sameFeeRange,
    hubs,
  }
}
