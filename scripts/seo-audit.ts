import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type ValidationResponse = {
  slug: string
  title?: { value: string; length: number; ok: boolean }
  description?: { value: string; length: number; ok: boolean }
  h1?: { value: string; ok: boolean }
  canonical?: { value: string; ok: boolean }
  schemas?: { types: string[]; count: number }
  keywords?: string[]
  issues?: string[]
  score?: number
  error?: string
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const source = fs.readFileSync(filePath, 'utf8')
  const lines = source.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2] || ''

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd()
  loadEnvFile(path.join(cwd, '.env'))
  loadEnvFile(path.join(cwd, '.env.local'))
}

function toCsvCell(value: unknown): string {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function writeCsv(filePath: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => toCsvCell(cell)).join(',')).join('\n')
  fs.writeFileSync(filePath, content, 'utf8')
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await iterator(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function main() {
  loadLocalEnv()

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const auditBaseUrl = String(
    process.env.SEO_AUDIT_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, '')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('pages')
    .select('slug')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch published pages: ${error.message}`)
  }

  const slugs = (data || [])
    .map((row: any) => String(row.slug || '').trim())
    .filter(Boolean)

  if (slugs.length === 0) {
    console.log('No published pages found. Nothing to audit.')
    return
  }

  console.log(`Auditing ${slugs.length} pages via ${auditBaseUrl}/api/seo/validate...`)

  const results = await mapWithConcurrency(slugs, 8, async (slug, index) => {
    const endpoint = `${auditBaseUrl}/api/seo/validate?slug=${encodeURIComponent(slug)}`

    try {
      const response = await fetch(endpoint)
      const payload = (await response.json()) as ValidationResponse

      if (!response.ok) {
        return {
          slug,
          score: 0,
          issues: [payload.error || `HTTP ${response.status}`],
          title: { value: '', length: 0, ok: false },
          description: { value: '', length: 0, ok: false },
        } satisfies ValidationResponse
      }

      if ((index + 1) % 50 === 0 || index + 1 === slugs.length) {
        console.log(`Processed ${index + 1}/${slugs.length}`)
      }

      return payload
    } catch (error) {
      return {
        slug,
        score: 0,
        issues: [`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        title: { value: '', length: 0, ok: false },
        description: { value: '', length: 0, ok: false },
      } satisfies ValidationResponse
    }
  })

  const good = results.filter((row) => Number(row.score || 0) > 80)
  const needsWork = results.filter((row) => Number(row.score || 0) >= 50 && Number(row.score || 0) <= 80)
  const critical = results.filter((row) => Number(row.score || 0) < 50)

  const issueCounts = new Map<string, number>()
  for (const row of results) {
    for (const issue of row.issues || []) {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1)
    }
  }

  const commonIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const csvRows: string[][] = [
    [
      'slug',
      'score',
      'title',
      'title_length',
      'description',
      'description_length',
      'canonical',
      'schema_types',
      'issues',
    ],
  ]

  for (const row of results) {
    csvRows.push([
      row.slug,
      String(row.score ?? 0),
      row.title?.value || '',
      String(row.title?.length ?? 0),
      row.description?.value || '',
      String(row.description?.length ?? 0),
      row.canonical?.value || '',
      (row.schemas?.types || []).join('|'),
      (row.issues || []).join(' | '),
    ])
  }

  const outputPath = path.join(process.cwd(), 'seo-audit-report.csv')
  writeCsv(outputPath, csvRows)

  console.log('')
  console.log('SEO AUDIT SUMMARY')
  console.log(`Total pages: ${results.length}`)
  console.log(`Pages with score > 80 (good): ${good.length}`)
  console.log(`Pages with score 50-80 (needs work): ${needsWork.length}`)
  console.log(`Pages with score < 50 (critical): ${critical.length}`)
  console.log('Common issues:')

  if (commonIssues.length === 0) {
    console.log('- None detected')
  } else {
    for (const [issue, count] of commonIssues) {
      console.log(`- ${issue}: ${count}`)
    }
  }

  console.log(`Report exported: ${outputPath}`)
}

main().catch((error) => {
  console.error('SEO audit failed:', error)
  process.exitCode = 1
})
