import { NextResponse } from 'next/server'
import { getPageBySlug } from '../../../../lib/api'
import {
  generateMetadata as generateSeoMetadata,
  generateAllSchemas,
  generateKeywords,
} from '../../../../lib/seo-engine'

function resolveTitle(metadataTitle: unknown): string {
  if (typeof metadataTitle === 'string') return metadataTitle
  if (metadataTitle && typeof metadataTitle === 'object') {
    const title = metadataTitle as Record<string, unknown>
    if (typeof title.absolute === 'string') return title.absolute
    if (typeof title.default === 'string') return title.default
  }
  return ''
}

function resolveDescription(metadataDescription: unknown): string {
  if (typeof metadataDescription === 'string') return metadataDescription
  return ''
}

function resolveCanonical(metadataAlternates: unknown): string {
  if (!metadataAlternates || typeof metadataAlternates !== 'object') return ''
  const alternates = metadataAlternates as Record<string, unknown>
  const canonical = alternates.canonical
  if (typeof canonical === 'string') return canonical
  return ''
}

function resolveSchemaTypes(schemaStrings: string[]): string[] {
  const types: string[] = []

  for (const raw of schemaStrings) {
    try {
      const parsed = JSON.parse(raw)
      const type = parsed?.['@type']
      if (typeof type === 'string') types.push(type)
      if (Array.isArray(type) && typeof type[0] === 'string') types.push(type[0])
    } catch {
      // Ignore malformed schema entries
    }
  }

  return Array.from(new Set(types))
}

function computeScore(args: {
  titleLength: number
  hasTitle: boolean
  descriptionLength: number
  hasDescription: boolean
  hasH1: boolean
  canonicalOk: boolean
  schemaCount: number
  keywordCount: number
  issues: string[]
}): number {
  let score = 100

  if (!args.hasTitle) score -= 25
  if (args.hasTitle && (args.titleLength < 30 || args.titleLength > 60)) score -= 10

  if (!args.hasDescription) score -= 20
  if (args.hasDescription && (args.descriptionLength < 120 || args.descriptionLength > 160)) score -= 10

  if (!args.hasH1) score -= 10
  if (!args.canonicalOk) score -= 10
  if (args.schemaCount < 4) score -= 12
  if (args.keywordCount < 20) score -= 8

  if (args.issues.length >= 8) score -= 10
  if (args.issues.length >= 12) score -= 10

  return Math.max(0, Math.min(100, score))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = String(searchParams.get('slug') || '').trim()

  if (!slug) {
    return NextResponse.json(
      {
        error: 'Missing slug query parameter',
      },
      { status: 400 }
    )
  }

  const page = await getPageBySlug(slug)
  if (!page) {
    return NextResponse.json(
      {
        error: 'Page not found',
        slug,
      },
      { status: 404 }
    )
  }

  const metadata = generateSeoMetadata(page)
  const titleValue = resolveTitle(metadata.title)
  const descriptionValue = resolveDescription(metadata.description)
  const h1Value = String(page.content_json?.seo?.h1 || page.h1_text || page.page_title || '').trim()
  const canonicalValue = resolveCanonical(metadata.alternates)
  const schemaStrings = generateAllSchemas(
    page,
    Array.isArray(page.content_json?.colleges) ? page.content_json?.colleges : [],
    Array.isArray(page.content_json?.faqs) ? page.content_json?.faqs : []
  )
  const schemaTypes = resolveSchemaTypes(schemaStrings)
  const keywords = generateKeywords(page)

  const titleLength = titleValue.length
  const descriptionLength = descriptionValue.length

  const issues: string[] = []

  if (!titleValue) issues.push('Missing SEO title')
  if (titleValue && (titleLength < 30 || titleLength > 60)) issues.push('Title length should be between 30 and 60 characters')

  if (!descriptionValue) issues.push('Missing meta description')
  if (descriptionValue && (descriptionLength < 120 || descriptionLength > 160)) {
    issues.push('Meta description length should be between 120 and 160 characters')
  }

  if (!h1Value) issues.push('Missing H1 value')

  const canonicalOk = /^https:\/\//.test(canonicalValue) && canonicalValue === canonicalValue.toLowerCase()
  if (!canonicalOk) issues.push('Canonical URL must be absolute and lowercase')

  if (schemaTypes.length === 0) issues.push('No structured data schemas detected')
  if (schemaTypes.length > 0 && !schemaTypes.includes('WebPage')) issues.push('Missing WebPage schema')
  if (schemaTypes.length > 0 && !schemaTypes.includes('BreadcrumbList')) issues.push('Missing BreadcrumbList schema')
  if (keywords.length < 20) issues.push('Insufficient keyword coverage (expected at least 20)')

  const score = computeScore({
    titleLength,
    hasTitle: Boolean(titleValue),
    descriptionLength,
    hasDescription: Boolean(descriptionValue),
    hasH1: Boolean(h1Value),
    canonicalOk,
    schemaCount: schemaTypes.length,
    keywordCount: keywords.length,
    issues,
  })

  return NextResponse.json({
    slug,
    title: {
      value: titleValue,
      length: titleLength,
      ok: Boolean(titleValue) && titleLength >= 30 && titleLength <= 60,
    },
    description: {
      value: descriptionValue,
      length: descriptionLength,
      ok: Boolean(descriptionValue) && descriptionLength >= 120 && descriptionLength <= 160,
    },
    h1: {
      value: h1Value,
      ok: Boolean(h1Value),
    },
    canonical: {
      value: canonicalValue,
      ok: canonicalOk,
    },
    schemas: {
      types: schemaTypes,
      count: schemaTypes.length,
    },
    keywords,
    issues,
    score,
  })
}
