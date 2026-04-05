import { NextRequest, NextResponse } from 'next/server'
import { getPageBySlug } from '../../../../lib/api'
import {
  generateDefinedTermsMarkup,
  generateReviewAggregateMarkup,
  generateSpeakableMarkup,
  generateTableMarkup,
} from '../../../../lib/aeo-engine'
import { generateAllSchemas, getCanonicalUrl } from '../../../../lib/seo-engine'

type RouteParams = { slug: string }

async function resolveParams(params: RouteParams | Promise<RouteParams>) {
  return Promise.resolve(params)
}

function parseJsonSchemas(input: string[]): Record<string, unknown>[] {
  return input
    .map((value) => {
      try {
        return JSON.parse(value) as Record<string, unknown>
      } catch {
        return null
      }
    })
    .filter((value): value is Record<string, unknown> => Boolean(value))
}

export async function GET(_request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await resolveParams(context.params)
  const slug = String(resolved?.slug || '').trim()

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const page = await getPageBySlug(slug)
  if (!page) {
    return NextResponse.json({ error: 'Page not found', slug }, { status: 404 })
  }

  const content = page.content_json || {}
  const colleges = Array.isArray(content.colleges) ? content.colleges : []
  const faqs = Array.isArray(content.faqs) ? content.faqs : []

  const seoSchemas = parseJsonSchemas(generateAllSchemas(page, colleges, faqs))

  const comparisonRows = Array.isArray(content.comparison_table)
    ? content.comparison_table
    : Array.isArray(content.comparison_table?.rows)
      ? content.comparison_table.rows
      : []

  const headers = comparisonRows.length
    ? Object.keys(comparisonRows[0])
    : Array.isArray(content.comparison_table?.headers)
      ? content.comparison_table.headers
      : []

  const canonicalUrl = getCanonicalUrl(page.slug || slug, 'college')

  const aeoSchemas = [
    generateSpeakableMarkup(page),
    page.course ? generateDefinedTermsMarkup(String(page.course)) : null,
    headers.length > 0
      ? generateTableMarkup({
          caption: typeof content.comparison_table?.caption === 'string' ? content.comparison_table.caption : undefined,
          headers,
          course: String(page.course || ''),
          city: String(page.city || ''),
          canonicalUrl,
        })
      : null,
    generateReviewAggregateMarkup(
      colleges.map((college: any) => ({
        ...college,
        course: page.course,
        city: page.city,
      }))
    ),
  ].filter((schema): schema is Record<string, unknown> => Boolean(schema))

  return NextResponse.json({
    slug,
    canonical: canonicalUrl,
    count: seoSchemas.length + aeoSchemas.length,
    schemas: [...seoSchemas, ...aeoSchemas],
  })
}
