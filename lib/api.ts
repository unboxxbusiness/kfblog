import { supabase } from './supabase'
import { Page, PageSummary, ContentJson } from './types'

/**
 * Fetch all published pages (summary fields)
 */
export async function getAllPages(): Promise<PageSummary[]> {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, page_title, created_at, updated_at')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as PageSummary[]
  } catch (err) {
    console.error('[getAllPages] error', err)
    return []
  }
}

/**
 * Fetch a single page by slug (includes full content_json)
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  const safeSlug = String(slug || '').trim()
  if (!safeSlug) return null
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, college_type, page_title, meta_desc, h1_text, content_json, published, created_at, updated_at')
      .eq('slug', safeSlug)
      .eq('published', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    // content_json is returned as object (jsonb) by Supabase/Postgres
    return data as Page
  } catch (err) {
    console.error('[getPageBySlug] error', err)
    return null
  }
}

/**
 * Helper to extract distinct values for a column from published pages
 */
async function getDistinctColumnValues(column: string): Promise<string[]> {
  if (typeof window !== 'undefined') {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('pages')
      .select(`${column}`)
      .eq('published', true)
      .order(column, { ascending: true })

    if (error) throw error
    const values = (data || []).map((r: any) => r[column]).filter(Boolean) as string[]
    return Array.from(new Set(values))
  } catch (err) {
    if (typeof window === 'undefined') {
      console.error(`[getDistinctColumnValues:${column}] error`, err)
    }
    return []
  }
}

export async function getCourses(): Promise<string[]> {
  return getDistinctColumnValues('course')
}

export async function getCities(): Promise<string[]> {
  return getDistinctColumnValues('city')
}

export async function getFeeRanges(): Promise<string[]> {
  return getDistinctColumnValues('fee_range')
}

export async function getExamTypes(): Promise<string[]> {
  return getDistinctColumnValues('exam_type')
}

export type SearchFilters = Partial<{
  course: string
  city: string
  fee_range: string
  exam_type: string
  q: string
  page: number
  limit: number
}> 

export interface SearchResult {
  data: Page[]
  count: number
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
  'with'
])

function sanitizeSearchTerm(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function extractSearchTerms(value: unknown): string[] {
  const safe = sanitizeSearchTerm(value)
  if (!safe) return []

  const terms = safe
    .toLowerCase()
    .split(' ')
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))

  return Array.from(new Set(terms)).slice(0, 8)
}

function buildSearchOrClause(terms: string[], fields: string[]): string {
  return terms
    .flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`))
    .join(',')
}

function applyFilters(query: any, filters: SearchFilters) {
  let q = query
  if (filters.course) q = q.eq('course', filters.course)
  if (filters.city) q = q.eq('city', filters.city)
  if (filters.fee_range) q = q.eq('fee_range', filters.fee_range)
  if (filters.exam_type) q = q.eq('exam_type', filters.exam_type)

  if (filters.q) {
    const terms = extractSearchTerms(filters.q)
    if (terms.length > 0) {
      q = q.or(
        buildSearchOrClause(terms, [
          'page_title',
          'h1_text',
          'course',
          'city',
          'fee_range',
          'exam_type',
          'content_json->seo->>title'
        ])
      )
    }
  }
  return q
}

export async function getPageCount(filters: SearchFilters = {}): Promise<number> {
  try {
    let query = supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)

    query = applyFilters(query, filters)
    const { count, error } = await query
    if (error) throw error
    return count || 0
  } catch (err) {
    console.error('[getPageCount] error', err)
    return 0
  }
}

/**
 * Search pages by optional filters and pagination. Returns SearchResult.
 */
export async function searchPages(filters: SearchFilters = {}): Promise<SearchResult> {
  try {
    const pageNum = filters.page || 1
    const limit = filters.limit || 24
    const from = (pageNum - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, page_title, h1_text, college_type, content_json, created_at')
      .eq('published', true)

    query = applyFilters(query, filters)

    const [rowsRes, count] = await Promise.all([
      query
        .order('created_at', { ascending: false })
        .range(from, to)
        .limit(limit),
      getPageCount(filters)
    ])

    const { data, error } = rowsRes
    
    if (error) throw error
    return { data: (data || []) as Page[], count }
  } catch (err) {
    console.error('[searchPages] error', err)
    return { data: [], count: 0 }
  }
}

export async function searchPagesFullText(q: string, limit = 30): Promise<Page[]> {
  const terms = extractSearchTerms(q)
  if (!terms.length) return []

  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, page_title, h1_text, college_type, content_json, created_at')
      .eq('published', true)
      .or(buildSearchOrClause(terms, ['page_title', 'h1_text', 'course', 'city', 'fee_range', 'exam_type', 'content_json->seo->>title']))
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []) as Page[]
  } catch (err) {
    console.error('[searchPagesFullText] error', err)
    return []
  }
}

export async function getSearchSuggestions(q: string, limit = 8): Promise<Array<{ slug: string; title: string; reason: string }>> {
  const terms = extractSearchTerms(q)
  if (!terms.length) return []
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('slug, page_title, course, city')
      .eq('published', true)
      .or(buildSearchOrClause(terms, ['page_title', 'course', 'city']))
      .limit(limit)

    if (error) throw error
    return (data || []).map((row: any) => {
      const lowerCourse = String(row.course || '').toLowerCase()
      const lowerCity = String(row.city || '').toLowerCase()
      const c = terms.some((term) => lowerCourse.includes(term))
      const city = terms.some((term) => lowerCity.includes(term))
      return {
        slug: row.slug,
        title: row.page_title || row.slug,
        reason: c && city ? 'Matches course + city' : c ? 'Matches course' : city ? 'Matches city' : 'Matches title'
      }
    })
  } catch (err) {
    console.error('[getSearchSuggestions] error', err)
    return []
  }
}

export async function getStats() {
  try {
    const [{ count }, courses, cities, exams] = await Promise.all([
      supabase.from('pages').select('id', { count: 'exact', head: true }).eq('published', true),
      getCourses(),
      getCities(),
      getExamTypes()
    ]);
    return {
      pages: count || 0,
      courses: courses.length,
      cities: cities.length,
      exams: exams.length
    }
  } catch(e) {
    return { pages: 0, courses: 0, cities: 0, exams: 0 }
  }
}

export async function getAllPublishedPagesDetailed(limit = 2000): Promise<Page[]> {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, college_type, page_title, h1_text, content_json, created_at, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []) as Page[]
  } catch (err) {
    console.error('[getAllPublishedPagesDetailed] error', err)
    return []
  }
}
