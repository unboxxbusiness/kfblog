'use client'

import * as React from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type PageRow = {
  id: string
  slug: string | null
  page_title: string | null
  course: string | null
  city: string | null
  exam_type: string | null
  fee_range: string | null
  published: boolean | null
  created_at: string | null
}

type StatusFilter = 'all' | 'published' | 'draft'

function normalizeKey(value: string | null | undefined) {
  const next = String(value || '').trim().toLowerCase()
  return next || null
}

function safeDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: string | null) {
  const parsed = safeDate(value)
  if (!parsed) return '—'
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeAgo(value: string | null) {
  const parsed = safeDate(value)
  if (!parsed) return 'Unknown'

  const diffMs = Date.now() - parsed.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function buildPublicPageHref(row: Pick<PageRow, 'slug' | 'published'>) {
  const slug = String(row.slug || '').trim()
  if (!slug || !row.published) return null
  return `/colleges/${encodeURIComponent(slug)}`
}

export default function AdminPagesPage() {
  const supabase = React.useMemo(() => createClientComponentClient(), [])
  const [rows, setRows] = React.useState<PageRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')

  const loadPages = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const primary = await supabase
      .from('pages')
      .select('id, slug, page_title, course, city, exam_type, fee_range, published, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (primary.error) {
      const fallback = await supabase
        .from('pages')
        .select('id, slug, page_title, published, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (fallback.error) {
        setRows([])
        console.error('[AdminPagesPage] pages load failed', {
          primary: primary.error,
          fallback: fallback.error,
        })
        setError('Unable to load pages')
        setLoading(false)
        return
      }

      const mapped: PageRow[] = (fallback.data || []).map((row: any) => ({
        id: String(row.id),
        slug: row.slug ?? null,
        page_title: row.page_title ?? null,
        course: null,
        city: null,
        exam_type: null,
        fee_range: null,
        published: typeof row.published === 'boolean' ? row.published : null,
        created_at: row.created_at ?? null,
      }))

      setRows(mapped)
      setLoading(false)
      return
    }

    const mapped: PageRow[] = (primary.data || []).map((row: any) => ({
      id: String(row.id),
      slug: row.slug ?? null,
      page_title: row.page_title ?? null,
      course: row.course ?? null,
      city: row.city ?? null,
      exam_type: row.exam_type ?? null,
      fee_range: row.fee_range ?? null,
      published: typeof row.published === 'boolean' ? row.published : null,
      created_at: row.created_at ?? null,
    }))

    setRows(mapped)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    void loadPages()
  }, [loadPages])

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return rows.filter((row) => {
      if (statusFilter === 'published' && !row.published) return false
      if (statusFilter === 'draft' && row.published) return false

      if (!normalizedQuery) return true

      const haystack = [row.page_title, row.slug, row.course, row.city, row.exam_type]
      return haystack.some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
    })
  }, [rows, query, statusFilter])

  const stats = React.useMemo(() => {
    const total = rows.length
    const published = rows.filter((row) => row.published).length
    const draft = total - published
    const cityCount = new Set(rows.map((row) => normalizeKey(row.city)).filter(Boolean) as string[]).size
    const courseCount = new Set(rows.map((row) => normalizeKey(row.course)).filter(Boolean) as string[]).size

    const last7Days = rows.filter((row) => {
      const date = safeDate(row.created_at)
      if (!date) return false
      return Date.now() - date.getTime() <= 7 * 24 * 60 * 60 * 1000
    }).length

    return {
      total,
      published,
      draft,
      cityCount,
      courseCount,
      last7Days,
    }
  }, [rows])

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#000000]">College Pages</h1>
        <p className="mt-2 text-sm text-[#666666]">
          Track page inventory, publishing status, and recently added content in one place.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">Total pages</p>
          <p className="mt-2 text-3xl font-bold text-[#14213d]">{stats.total}</p>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">Published</p>
          <p className="mt-2 text-3xl font-bold text-[#15803d]">{stats.published}</p>
          <p className="mt-1 text-xs text-[#666666]">{stats.draft} draft/unpublished</p>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">Added in last 7 days</p>
          <p className="mt-2 text-3xl font-bold text-[#14213d]">{stats.last7Days}</p>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">Course coverage</p>
          <p className="mt-2 text-3xl font-bold text-[#14213d]">{stats.courseCount}</p>
          <p className="mt-1 text-xs text-[#666666]">unique courses</p>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">City coverage</p>
          <p className="mt-2 text-3xl font-bold text-[#14213d]">{stats.cityCount}</p>
          <p className="mt-1 text-xs text-[#666666]">unique cities</p>
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#666666]">Filtered rows</p>
          <p className="mt-2 text-3xl font-bold text-[#14213d]">{filteredRows.length}</p>
          <p className="mt-1 text-xs text-[#666666]">based on current search/filter</p>
        </article>
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold text-[#000000]">Page Inventory</h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, slug, city, or course"
              className="w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#333333] outline-none transition focus:border-[#14213d] focus:ring-2 focus:ring-[#dbeafe] sm:w-72"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#333333] outline-none transition focus:border-[#14213d] focus:ring-2 focus:ring-[#dbeafe]"
            >
              <option value="all">All statuses</option>
              <option value="published">Published only</option>
              <option value="draft">Draft/Unpublished</option>
            </select>

            <button
              type="button"
              onClick={() => void loadPages()}
              className="rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm font-medium text-[#14213d] transition hover:bg-[#f8fbff]"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-[#fecaca] bg-[#fff7f7] p-3">
            <p className="text-sm font-medium text-[#b91c1c]">Unable to load page inventory</p>
            <p className="mt-1 text-xs text-[#7f1d1d]">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#d7deea] bg-[#f8fbff] p-6 text-center">
            <p className="text-sm font-semibold text-[#1e293b]">No pages found</p>
            <p className="mt-1 text-xs text-[#64748b]">Try changing your search or status filter.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fafafa] text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Title / Slug</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Course</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">City</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Status</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Created</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eef2f7] bg-white">
                {filteredRows.map((row) => {
                  const pageHref = buildPublicPageHref(row)

                  return (
                    <tr key={row.id} className="hover:bg-[#fafcff]">
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-[#111827]">{row.page_title || 'Untitled page'}</p>
                        <p className="mt-0.5 text-xs text-[#64748b]">/{row.slug || 'no-slug'}</p>
                      </td>
                      <td className="px-3 py-2 text-[#334155]">{row.course || '—'}</td>
                      <td className="px-3 py-2 text-[#334155]">{row.city || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.published ? 'bg-[#ecfdf5] text-[#166534]' : 'bg-[#f1f5f9] text-[#334155]'
                          }`}
                        >
                          {row.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#334155]">
                        <p>{formatDate(row.created_at)}</p>
                        <p className="text-xs text-[#64748b]">{formatTimeAgo(row.created_at)}</p>
                      </td>
                      <td className="px-3 py-2">
                        {pageHref ? (
                          <Link
                            href={pageHref}
                            prefetch
                            className="inline-flex rounded-md border border-[#d8e3f4] bg-[#f8fbff] px-2.5 py-1 text-xs font-medium text-[#14213d] transition hover:bg-[#eef4ff]"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="inline-flex rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium text-[#64748b]">
                            Not live
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
