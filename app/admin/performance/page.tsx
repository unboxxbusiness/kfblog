'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type VitalRow = {
  metric: string | null
  page: string | null
  value: number | null
  created_at: string | null
  is_alert?: boolean | null
}

type CronLogRow = {
  job_name?: string | null
  event?: string | null
  status?: string | null
  message?: string | null
  details?: Record<string, unknown> | null
  payload?: Record<string, unknown> | null
  created_at?: string | null
}

type PageRow = {
  slug: string | null
}

type SeoValidationResult = {
  slug: string
  score: number
  issues: string[]
}

function normalize(value: unknown): string {
  return String(value || '').trim()
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2))
}

function toDateLabel(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN')
}

function topByMetric(rows: VitalRow[], metricName: string, limit: number): Array<{ page: string; value: number }> {
  const filtered = rows.filter((row) => normalize(row.metric).toUpperCase() === metricName.toUpperCase())

  const grouped = new Map<string, number[]>()
  filtered.forEach((row) => {
    const page = normalize(row.page)
    const value = typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null
    if (!page || value === null) return

    const bucket = grouped.get(page) || []
    bucket.push(value)
    grouped.set(page, bucket)
  })

  return Array.from(grouped.entries())
    .map(([page, values]) => ({ page, value: average(values) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export default function AdminPerformancePage() {
  const supabase = React.useMemo(() => createClientComponentClient(), [])

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [vitalsRows, setVitalsRows] = React.useState<VitalRow[]>([])
  const [cronRows, setCronRows] = React.useState<CronLogRow[]>([])
  const [schemaRows, setSchemaRows] = React.useState<SeoValidationResult[]>([])
  const [sitemapUrlCount, setSitemapUrlCount] = React.useState(0)
  const [revalidating, setRevalidating] = React.useState(false)
  const [lastRefreshed, setLastRefreshed] = React.useState<string>('')

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [vitalsRes, cronRes, pagesRes] = await Promise.all([
        supabase
          .from('vitals')
          .select('metric, page, value, created_at, is_alert')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('cron_logs')
          .select('job_name, event, status, message, details, payload, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('pages')
          .select('slug')
          .eq('published', true)
          .order('updated_at', { ascending: false })
          .limit(30),
      ])

      if (vitalsRes.error) throw new Error(vitalsRes.error.message)

      setVitalsRows((vitalsRes.data || []) as VitalRow[])
      setCronRows((cronRes.data || []) as CronLogRow[])

      const pages = (pagesRes.data || []) as PageRow[]
      const slugs = pages
        .map((row) => normalize(row.slug))
        .filter(Boolean)

      const validations = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const response = await fetch(`/api/seo/validate?slug=${encodeURIComponent(slug)}`)
            const payload = (await response.json()) as { score?: number; issues?: string[] }
            return {
              slug,
              score: Number(payload.score || 0),
              issues: Array.isArray(payload.issues) ? payload.issues : [],
            }
          } catch {
            return {
              slug,
              score: 0,
              issues: ['Validation unavailable'],
            }
          }
        })
      )

      try {
        const sitemapResponse = await fetch('/sitemap.xml', { cache: 'no-store' })
        const xml = await sitemapResponse.text()
        const count = (xml.match(/<loc>/g) || []).length
        setSitemapUrlCount(count)
      } catch {
        setSitemapUrlCount(0)
      }

      setSchemaRows(validations)
      setLastRefreshed(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const metricAverages = React.useMemo(() => {
    const buckets = new Map<string, number[]>()

    vitalsRows.forEach((row) => {
      const metric = normalize(row.metric).toUpperCase()
      const value = typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null
      if (!metric || value === null) return

      const list = buckets.get(metric) || []
      list.push(value)
      buckets.set(metric, list)
    })

    return {
      LCP: average(buckets.get('LCP') || []),
      CLS: average(buckets.get('CLS') || []),
      INP: average(buckets.get('INP') || []),
      FCP: average(buckets.get('FCP') || []),
    }
  }, [vitalsRows])

  const slowestPages = React.useMemo(() => topByMetric(vitalsRows, 'LCP', 10), [vitalsRows])

  const clsViolations = React.useMemo(
    () => vitalsRows.filter((row) => normalize(row.metric).toUpperCase() === 'CLS' && Number(row.value || 0) > 0.25),
    [vitalsRows]
  )

  const crawlStats = React.useMemo(() => {
    const publishedPages = new Set(vitalsRows.map((row) => normalize(row.page)).filter(Boolean)).size
    const crawlable = Math.max(publishedPages, schemaRows.length, sitemapUrlCount)
    return {
      estimatedCrawlablePages: crawlable,
      estimatedGoogleCrawlHitsPerDay: Math.round(crawlable * 1.35),
      indexNowSubmissions: cronRows.filter((row) => {
        const job = normalize(row.job_name || row.event).toLowerCase()
        return job.includes('index')
      }).length,
      sitemapUrlCount,
    }
  }, [vitalsRows, schemaRows, cronRows, sitemapUrlCount])

  const schemaSummary = React.useMemo(() => {
    const passed = schemaRows.filter((row) => row.score >= 80).length
    const failed = schemaRows.length - passed
    return { passed, failed, total: schemaRows.length }
  }, [schemaRows])

  const forceRevalidate = React.useCallback(async () => {
    setRevalidating(true)

    try {
      const response = await fetch('/api/cron/revalidate', { method: 'GET' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Revalidation failed')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revalidation failed')
    } finally {
      setRevalidating(false)
    }
  }, [loadData])

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#000000]">Performance Dashboard</h1>
            <p className="mt-1 text-sm text-[#666666]">Core Web Vitals, crawl efficiency, IndexNow history, and schema quality.</p>
            {lastRefreshed ? <p className="mt-1 text-xs text-[#94a3b8]">Last refreshed: {toDateLabel(lastRefreshed)}</p> : null}
          </div>

          <button
            type="button"
            onClick={forceRevalidate}
            disabled={revalidating}
            className="rounded-md bg-[#14213d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f1a30] disabled:opacity-60"
          >
            {revalidating ? 'Revalidating...' : 'Force revalidate all'}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-lg border border-[#fecaca] bg-[#fff7f7] p-4">
          <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Avg LCP', value: `${metricAverages.LCP.toFixed(1)} ms` },
          { label: 'Avg CLS', value: metricAverages.CLS.toFixed(3) },
          { label: 'Avg INP', value: `${metricAverages.INP.toFixed(1)} ms` },
          { label: 'Avg FCP', value: `${metricAverages.FCP.toFixed(1)} ms` },
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#666666]">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#14213d]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000000]">Top 10 slowest pages (LCP)</h2>
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="text-sm text-[#666666]">Loading...</p>
            ) : slowestPages.length === 0 ? (
              <p className="text-sm text-[#666666]">No LCP data yet.</p>
            ) : (
              slowestPages.map((row) => (
                <div key={row.page} className="flex items-center justify-between rounded-md bg-[#fafafa] px-3 py-2 text-sm">
                  <span className="truncate pr-2 text-[#333333]">{row.page}</span>
                  <span className="font-semibold text-[#14213d]">{row.value.toFixed(1)} ms</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000000]">CLS violations (&gt; 0.25)</h2>
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-[#666666]">Loading...</p>
            ) : clsViolations.length === 0 ? (
              <p className="text-sm text-[#666666]">No CLS violations detected.</p>
            ) : (
              clsViolations.slice(0, 20).map((row, index) => (
                <div key={`${row.page}-${index}`} className="rounded-md bg-[#fff7f7] px-3 py-2 text-sm">
                  <p className="font-medium text-[#7f1d1d]">{row.page || 'Unknown page'}</p>
                  <p className="text-xs text-[#b91c1c]">CLS: {Number(row.value || 0).toFixed(3)} · {toDateLabel(row.created_at || null)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000000]">Crawl stats</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#333333]">
            <li>Estimated crawlable pages: {crawlStats.estimatedCrawlablePages}</li>
            <li>URLs discovered from sitemap: {crawlStats.sitemapUrlCount}</li>
            <li>Estimated Google crawl hits/day: {crawlStats.estimatedGoogleCrawlHitsPerDay}</li>
            <li>IndexNow submissions logged: {crawlStats.indexNowSubmissions}</li>
          </ul>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000000]">Schema validation status</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#333333]">
            <li>Total checked: {schemaSummary.total}</li>
            <li>Passing (score ≥ 80): {schemaSummary.passed}</li>
            <li>Needs fixes: {schemaSummary.failed}</li>
          </ul>
        </article>
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[#000000]">IndexNow / crawl history</h2>
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#666666]">Loading...</p>
          ) : cronRows.length === 0 ? (
            <p className="text-sm text-[#666666]">No cron logs found yet.</p>
          ) : (
            cronRows
              .filter((row) => {
                const job = normalize(row.job_name || row.event).toLowerCase()
                return job.includes('index') || job.includes('sitemap') || job.includes('crawl')
              })
              .slice(0, 20)
              .map((row, index) => (
                <div key={`${row.created_at}-${index}`} className="rounded-md border border-[#eef2f7] px-3 py-2 text-sm">
                  <p className="font-medium text-[#0f172a]">{row.job_name || row.event || 'job'}</p>
                  <p className="text-xs text-[#475569]">{row.status || 'unknown'} · {row.message || 'No message'}</p>
                  <p className="text-xs text-[#94a3b8]">{toDateLabel(row.created_at || null)}</p>
                </div>
              ))
          )}
        </div>
      </section>
    </main>
  )
}
