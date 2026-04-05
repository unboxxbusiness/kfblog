import { NextRequest, NextResponse } from 'next/server'
import { getPageBySlug } from '../../../../lib/api'
import { rateLimit } from '../../../../lib/security/rate-limit'
import type { College } from '../../../../lib/types'

type RouteParams = { slug: string }

const RATE_LIMIT_REQUESTS = 100
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const RESPONSE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, s-maxage=3600',
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
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

async function resolveParams(params: RouteParams | Promise<RouteParams>) {
  return Promise.resolve(params)
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS })
}

export async function GET(request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
  const limitResult = rateLimit({
    request,
    keyPrefix: 'public-college-page-api',
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

  const resolvedParams = await resolveParams(context.params)
  const slug = normalizeText(resolvedParams?.slug)

  if (!slug) {
    return jsonResponse({ error: 'Missing slug parameter' }, 400)
  }

  const page = await getPageBySlug(slug)
  if (!page) {
    return jsonResponse({ error: 'Page not found', slug }, 404)
  }

  const collegesRaw = page.content_json?.colleges
  const colleges = Array.isArray(collegesRaw) ? (collegesRaw as College[]) : []

  const placementValues = colleges
    .map((college) => toFiniteNumber(college.placement_percent))
    .filter((value): value is number => value !== null && value > 0)

  const packageValues = colleges
    .map((college) => toFiniteNumber(college.avg_package_lpa))
    .filter((value): value is number => value !== null && value > 0)

  const baseUrl =
    normalizeText(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeText(process.env.NEXT_PUBLIC_SITE_URL) ||
    request.nextUrl.origin ||
    'https://kampusfilter.com'

  const canonical = `${baseUrl.replace(/\/+$/, '')}/colleges/${encodeURIComponent(slug)}`

  return jsonResponse({
    result: {
      page_title: normalizeText(page.page_title || page.h1_text || slug),
      slug,
      url: canonical,
      course: normalizeText(page.course),
      city: normalizeText(page.city),
      fee_range: normalizeText(page.fee_range),
      exam_type: normalizeText(page.exam_type),
      summary: normalizeText(page.content_json?.intro?.paragraph),
      colleges_count: colleges.length,
      avg_placement_percent: placementValues.length > 0 ? Math.round(average(placementValues)) : 0,
      avg_package_lpa: packageValues.length > 0 ? Number(average(packageValues).toFixed(1)) : 0,
      content: page.content_json || {},
    },
    source: 'Kampus Filter - kampusfilter.com',
    last_updated: normalizeText(page.updated_at || page.created_at || new Date().toISOString()),
  })
}
