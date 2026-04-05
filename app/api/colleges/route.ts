import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { rateLimit } from '../../../lib/security/rate-limit'
import type { College } from '../../../lib/types'

type PageRow = {
  slug: string
  page_title?: string | null
  course?: string | null
  city?: string | null
  fee_range?: string | null
  exam_type?: string | null
  content_json?: Record<string, unknown> | null
  updated_at?: string | null
}

const LIMIT_MIN = 1
const LIMIT_MAX = 10
const RATE_LIMIT_REQUESTS = 100
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const RESPONSE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, s-maxage=3600',
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...RESPONSE_HEADERS,
      ...(headers || {}),
    },
  })
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function sanitizeFilter(value: string): string {
  return normalizeText(value).replace(/[%_]/g, '')
}

function parseLimit(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) return LIMIT_MAX
  return Math.max(LIMIT_MIN, Math.min(LIMIT_MAX, Math.floor(parsed)))
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]): number {
  if (!values.length) return 0
  const total = values.reduce((acc, value) => acc + value, 0)
  return total / values.length
}

function readColleges(contentJson: Record<string, unknown> | null | undefined): College[] {
  const rows = contentJson?.colleges
  return Array.isArray(rows) ? (rows as College[]) : []
}

function getSummary(contentJson: Record<string, unknown> | null | undefined): string {
  const intro = contentJson?.intro
  if (!intro || typeof intro !== 'object') return ''

  const paragraph = (intro as Record<string, unknown>).paragraph
  return normalizeText(paragraph)
}

function buildUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/colleges/${encodeURIComponent(slug)}`
}

function computeLastUpdated(rows: PageRow[]): string {
  const dates = rows
    .map((row) => normalizeText(row.updated_at))
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))

  if (dates.length === 0) {
    return new Date().toISOString()
  }

  const latest = dates.sort((a, b) => b.getTime() - a.getTime())[0]
  return latest.toISOString()
}

function mapResult(row: PageRow, origin: string) {
  const colleges = readColleges(row.content_json)

  const placements = colleges
    .map((college) => toFiniteNumber(college.placement_percent))
    .filter((value): value is number => value !== null && value > 0)

  const packages = colleges
    .map((college) => toFiniteNumber(college.avg_package_lpa))
    .filter((value): value is number => value !== null && value > 0)

  const featuredCollege =
    colleges.find((college) => Boolean(college.is_featured)) ||
    colleges.find((college) => normalizeText(college.type).toLowerCase().includes('private')) ||
    colleges[0]

  const topGovtCollege = colleges.find((college) => {
    const type = normalizeText(college.type).toLowerCase()
    return type.includes('gov') || type.includes('government')
  })

  return {
    page_title: normalizeText(row.page_title || row.slug),
    slug: row.slug,
    url: buildUrl(origin, row.slug),
    course: normalizeText(row.course),
    city: normalizeText(row.city),
    fee_range: normalizeText(row.fee_range),
    exam_type: normalizeText(row.exam_type),
    colleges_count: colleges.length,
    avg_placement_percent: placements.length ? Math.round(average(placements)) : 0,
    avg_package_lpa: packages.length ? Number(average(packages).toFixed(1)) : 0,
    featured_college: normalizeText(featuredCollege?.name || ''),
    top_govt_college: normalizeText(topGovtCollege?.name || ''),
    summary: getSummary(row.content_json),
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS })
}

export async function GET(request: NextRequest) {
  const limitResult = rateLimit({
    request,
    keyPrefix: 'public-colleges-api',
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!limitResult.ok) {
    return jsonResponse(
      {
        error: 'Rate limit exceeded. Please retry later.',
      },
      429,
      { 'Retry-After': String(limitResult.retryAfterSeconds) }
    )
  }

  const params = request.nextUrl.searchParams
  const course = sanitizeFilter(params.get('course') || '')
  const city = sanitizeFilter(params.get('city') || '')
  const feeRange = sanitizeFilter(params.get('fee_range') || '')
  const examType = sanitizeFilter(params.get('exam_type') || '')
  const limit = parseLimit(params.get('limit'))

  let query = supabase
    .from('pages')
    .select('slug, page_title, course, city, fee_range, exam_type, content_json, updated_at', { count: 'exact' })
    .eq('published', true)

  if (course) query = query.ilike('course', `%${course}%`)
  if (city) query = query.ilike('city', `%${city}%`)
  if (feeRange) query = query.ilike('fee_range', `%${feeRange}%`)
  if (examType) query = query.ilike('exam_type', `%${examType}%`)

  const { data, error, count } = await query.order('updated_at', { ascending: false }).limit(limit)

  if (error) {
    return jsonResponse(
      {
        error: 'Unable to fetch college pages',
      },
      500
    )
  }

  const rows = (data || []) as PageRow[]
  const baseUrl =
    normalizeText(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeText(process.env.NEXT_PUBLIC_SITE_URL) ||
    request.nextUrl.origin ||
    'https://kampusfilter.com'

  const results = rows.map((row) => mapResult(row, baseUrl))

  return jsonResponse({
    results,
    total: Number.isFinite(count || 0) ? Number(count) : results.length,
    source: 'Kampus Filter - kampusfilter.com',
    last_updated: computeLastUpdated(rows),
  })
}
