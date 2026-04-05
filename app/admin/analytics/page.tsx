'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type EnquiryRow = {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  status: string | null
  course_interest: string | null
  city_interest: string | null
  created_at: string | null
}

type PageRow = {
  id: string
  published: boolean | null
  course: string | null
  city: string | null
  created_at: string | null
}

type Bucket = {
  label: string
  value: number
}

type DailyPoint = {
  key: string
  label: string
  value: number
}

type AnalyticsSnapshot = {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  enrolledLeads: number
  rejectedLeads: number
  otherStatusLeads: number
  leadsLast7Days: number
  leadsLast30Days: number
  contactRate: number
  enrolledRateOverall: number
  enrolledRateFromContacted: number
  statusBuckets: Bucket[]
  topCourses: Bucket[]
  topCities: Bucket[]
  dailyLeads14: DailyPoint[]
  pagesTotal: number
  pagesPublished: number
  pagesDraft: number
  pagesAdded30Days: number
  pageCourseCoverage: number
  pageCityCoverage: number
  publishRate: number
  recentLeads: EnquiryRow[]
}

const defaultSnapshot: AnalyticsSnapshot = {
  totalLeads: 0,
  newLeads: 0,
  contactedLeads: 0,
  enrolledLeads: 0,
  rejectedLeads: 0,
  otherStatusLeads: 0,
  leadsLast7Days: 0,
  leadsLast30Days: 0,
  contactRate: 0,
  enrolledRateOverall: 0,
  enrolledRateFromContacted: 0,
  statusBuckets: [],
  topCourses: [],
  topCities: [],
  dailyLeads14: [],
  pagesTotal: 0,
  pagesPublished: 0,
  pagesDraft: 0,
  pagesAdded30Days: 0,
  pageCourseCoverage: 0,
  pageCityCoverage: 0,
  publishRate: 0,
  recentLeads: [],
}

function normalizeStatus(value: string | null | undefined) {
  const status = String(value || 'new').trim().toLowerCase()
  if (status === 'new') return 'new'
  if (status === 'contacted') return 'contacted'
  if (status === 'enrolled') return 'enrolled'
  if (status === 'rejected') return 'rejected'
  return 'other'
}

function normalizeBucketKey(value: string | null | undefined) {
  const next = String(value || '').trim()
  return next.length > 0 ? next : null
}

function toDayKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function percent(part: number, total: number) {
  if (!total) return 0
  return Number(((part / total) * 100).toFixed(1))
}

function buildTopBuckets(values: Array<string | null | undefined>, limit: number): Bucket[] {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    const key = normalizeBucketKey(value)
    if (!key) return
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function buildDailySeries14(rows: EnquiryRow[]) {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const date = parseDate(row.created_at)
    if (!date) return
    const key = toDayKey(date)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const today = new Date()
  const output: DailyPoint[] = []

  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = toDayKey(date)

    output.push({
      key,
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value: counts.get(key) || 0,
    })
  }

  return output
}

function isWithinDays(value: string | null, days: number) {
  const date = parseDate(value)
  if (!date) return false
  const diff = Date.now() - date.getTime()
  return diff <= days * 24 * 60 * 60 * 1000
}

function MetricCard({
  title,
  value,
  subtitle,
  colorClass,
}: {
  title: string
  value: string | number
  subtitle?: string
  colorClass?: string
}) {
  return (
    <article className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#666666]">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${colorClass || 'text-[#14213d]'}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[#666666]">{subtitle}</p> : null}
    </article>
  )
}

function statusBadge(status: string) {
  if (status === 'contacted') return 'bg-[#fef3c7] text-[#92400e]'
  if (status === 'enrolled') return 'bg-[#dcfce7] text-[#166534]'
  if (status === 'rejected') return 'bg-[#fee2e2] text-[#991b1b]'
  if (status === 'other') return 'bg-[#e2e8f0] text-[#334155]'
  return 'bg-[#fff8ec] text-[#b45309]'
}

function formatStatusLabel(status: string) {
  if (status === 'new') return 'New'
  if (status === 'contacted') return 'Contacted'
  if (status === 'enrolled') return 'Enrolled'
  if (status === 'rejected') return 'Rejected'
  return 'Other'
}

function formatDate(value: string | null) {
  const date = parseDate(value)
  if (!date) return 'Unknown'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminAnalyticsPage() {
  const supabase = React.useMemo(() => createClientComponentClient(), [])
  const [snapshot, setSnapshot] = React.useState<AnalyticsSnapshot>(defaultSnapshot)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null)

  const loadAnalytics = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const [enquiriesResult, pagesPrimaryResult] = await Promise.all([
      supabase
        .from('enquiries')
        .select('id, name, email, mobile, status, course_interest, city_interest, created_at')
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase.from('pages').select('id, published, course, city, created_at').limit(5000),
    ])

    if (enquiriesResult.error) {
      setSnapshot(defaultSnapshot)
      console.error('[AdminAnalyticsPage] enquiries load failed', enquiriesResult.error)
      setError('Unable to load enquiry analytics.')
      setLoading(false)
      return
    }

    let pagesRows: PageRow[] = []
    if (pagesPrimaryResult.error) {
      const pagesFallbackResult = await supabase
        .from('pages')
        .select('id, published, created_at')
        .limit(5000)

      if (pagesFallbackResult.error) {
        setSnapshot(defaultSnapshot)
        console.error('[AdminAnalyticsPage] pages load failed', {
          primary: pagesPrimaryResult.error,
          fallback: pagesFallbackResult.error,
        })
        setError('Unable to load analytics.')
        setLoading(false)
        return
      }

      pagesRows = (pagesFallbackResult.data || []).map((row: any) => ({
        id: String(row.id),
        published: typeof row.published === 'boolean' ? row.published : null,
        course: null,
        city: null,
        created_at: row.created_at ?? null,
      }))
    } else {
      pagesRows = (pagesPrimaryResult.data || []).map((row: any) => ({
        id: String(row.id),
        published: typeof row.published === 'boolean' ? row.published : null,
        course: row.course ?? null,
        city: row.city ?? null,
        created_at: row.created_at ?? null,
      }))
    }

    const enquiryRows = (enquiriesResult.data || []) as EnquiryRow[]

    const statusCounts = {
      new: 0,
      contacted: 0,
      enrolled: 0,
      rejected: 0,
      other: 0,
    }

    enquiryRows.forEach((row) => {
      const status = normalizeStatus(row.status)
      statusCounts[status] += 1
    })

    const totalLeads = enquiryRows.length
    const pagesTotal = pagesRows.length
    const pagesPublished = pagesRows.filter((row) => row.published).length

    const nextSnapshot: AnalyticsSnapshot = {
      totalLeads,
      newLeads: statusCounts.new,
      contactedLeads: statusCounts.contacted,
      enrolledLeads: statusCounts.enrolled,
      rejectedLeads: statusCounts.rejected,
      otherStatusLeads: statusCounts.other,
      leadsLast7Days: enquiryRows.filter((row) => isWithinDays(row.created_at, 7)).length,
      leadsLast30Days: enquiryRows.filter((row) => isWithinDays(row.created_at, 30)).length,
      contactRate: percent(statusCounts.contacted, totalLeads),
      enrolledRateOverall: percent(statusCounts.enrolled, totalLeads),
      enrolledRateFromContacted: percent(statusCounts.enrolled, statusCounts.contacted),
      statusBuckets: [
        { label: 'new', value: statusCounts.new },
        { label: 'contacted', value: statusCounts.contacted },
        { label: 'enrolled', value: statusCounts.enrolled },
        { label: 'rejected', value: statusCounts.rejected },
        { label: 'other', value: statusCounts.other },
      ],
      topCourses: buildTopBuckets(enquiryRows.map((row) => row.course_interest), 8),
      topCities: buildTopBuckets(enquiryRows.map((row) => row.city_interest), 8),
      dailyLeads14: buildDailySeries14(enquiryRows),
      pagesTotal,
      pagesPublished,
      pagesDraft: pagesTotal - pagesPublished,
      pagesAdded30Days: pagesRows.filter((row) => isWithinDays(row.created_at, 30)).length,
      pageCourseCoverage: new Set(pagesRows.map((row) => normalizeBucketKey(row.course)).filter(Boolean) as string[]).size,
      pageCityCoverage: new Set(pagesRows.map((row) => normalizeBucketKey(row.city)).filter(Boolean) as string[]).size,
      publishRate: percent(pagesPublished, pagesTotal),
      recentLeads: enquiryRows.slice(0, 8),
    }

    setSnapshot(nextSnapshot)
    setLastUpdated(new Date().toLocaleString('en-IN'))
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const maxStatus = React.useMemo(
    () => snapshot.statusBuckets.reduce((max, bucket) => Math.max(max, bucket.value), 1),
    [snapshot.statusBuckets]
  )

  const maxDaily = React.useMemo(
    () => snapshot.dailyLeads14.reduce((max, point) => Math.max(max, point.value), 1),
    [snapshot.dailyLeads14]
  )

  const maxTopCourse = React.useMemo(
    () => snapshot.topCourses.reduce((max, bucket) => Math.max(max, bucket.value), 1),
    [snapshot.topCourses]
  )

  const maxTopCity = React.useMemo(
    () => snapshot.topCities.reduce((max, bucket) => Math.max(max, bucket.value), 1),
    [snapshot.topCities]
  )

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#000000]">Analytics</h1>
            <p className="mt-2 text-sm text-[#666666]">
              Full performance overview across leads and content publishing.
            </p>
            {lastUpdated ? <p className="mt-1 text-xs text-[#64748b]">Last updated: {lastUpdated}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="inline-flex items-center justify-center rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm font-medium text-[#14213d] transition hover:bg-[#f8fbff]"
          >
            Refresh analytics
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-[#fecaca] bg-[#fff7f7] p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#b91c1c]">Analytics data issue</p>
          <p className="mt-1 text-xs text-[#7f1d1d]">{error}</p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Total Leads" value={snapshot.totalLeads} subtitle={`${snapshot.leadsLast30Days} added in last 30 days`} />
        <MetricCard title="New Leads" value={snapshot.newLeads} subtitle={`${snapshot.leadsLast7Days} added in last 7 days`} colorClass="text-[#b45309]" />
        <MetricCard
          title="Contacted Leads"
          value={snapshot.contactedLeads}
          subtitle={`${snapshot.contactRate}% of total leads`}
          colorClass="text-[#92400e]"
        />
        <MetricCard
          title="Enrolled Leads"
          value={snapshot.enrolledLeads}
          subtitle={`${snapshot.enrolledRateOverall}% overall conversion`}
          colorClass="text-[#166534]"
        />
        <MetricCard
          title="Enrolled From Contacted"
          value={`${snapshot.enrolledRateFromContacted}%`}
          subtitle="Contact-to-enroll conversion"
          colorClass="text-[#166534]"
        />
        <MetricCard
          title="Rejected Leads"
          value={snapshot.rejectedLeads}
          subtitle={snapshot.otherStatusLeads > 0 ? `${snapshot.otherStatusLeads} in other statuses` : 'No leads in other statuses'}
          colorClass="text-[#991b1b]"
        />
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#000000]">Lead Status Distribution</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
              <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
              <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
            </div>
          ) : snapshot.statusBuckets.every((bucket) => bucket.value === 0) ? (
            <p className="text-sm text-[#666666]">No lead status data available yet.</p>
          ) : (
            snapshot.statusBuckets.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#333333]">{formatStatusLabel(bucket.label)}</span>
                  <span className="text-[#666666]">{bucket.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[#f5f5f5]">
                  <div
                    className="h-full rounded-full bg-[#14213d]"
                    style={{ width: `${Math.max(6, (bucket.value / maxStatus) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#000000]">Leads Trend (Last 14 Days)</h2>
          {loading ? (
            <div className="mt-4 h-32 animate-pulse rounded-lg bg-[#f3f4f6]" />
          ) : snapshot.dailyLeads14.every((point) => point.value === 0) ? (
            <p className="mt-4 text-sm text-[#666666]">No daily lead activity found yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="flex min-w-[640px] items-end gap-2">
                {snapshot.dailyLeads14.map((point) => (
                  <div key={point.key} className="flex w-10 flex-col items-center gap-1">
                    <span className="text-[10px] text-[#475569]">{point.value}</span>
                    <div className="flex h-24 w-full items-end rounded bg-[#f8fafc] px-1">
                      <div
                        className="w-full rounded-t bg-[#14213d]"
                        style={{ height: `${Math.max(6, (point.value / maxDaily) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#64748b]">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#000000]">Pipeline Health</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-3">
              <p className="text-xs uppercase tracking-wide text-[#64748b]">Contact Rate</p>
              <p className="mt-1 text-2xl font-bold text-[#0f172a]">{snapshot.contactRate}%</p>
            </div>
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-3">
              <p className="text-xs uppercase tracking-wide text-[#64748b]">Overall Enrollment Rate</p>
              <p className="mt-1 text-2xl font-bold text-[#166534]">{snapshot.enrolledRateOverall}%</p>
            </div>
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-3">
              <p className="text-xs uppercase tracking-wide text-[#64748b]">Contact to Enrollment</p>
              <p className="mt-1 text-2xl font-bold text-[#166534]">{snapshot.enrolledRateFromContacted}%</p>
            </div>
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#000000]">Top Courses by Leads</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
                <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
              </div>
            ) : snapshot.topCourses.length === 0 ? (
              <p className="text-sm text-[#666666]">No course-interest data available yet.</p>
            ) : (
              snapshot.topCourses.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#333333]">{bucket.label}</span>
                    <span className="text-[#666666]">{bucket.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f5f5f5]">
                    <div
                      className="h-full rounded-full bg-[#14213d]"
                      style={{ width: `${Math.max(6, (bucket.value / maxTopCourse) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#000000]">Top Cities by Leads</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
                <div className="h-8 animate-pulse rounded-lg bg-[#f3f4f6]" />
              </div>
            ) : snapshot.topCities.length === 0 ? (
              <p className="text-sm text-[#666666]">No city-interest data available yet.</p>
            ) : (
              snapshot.topCities.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#333333]">{bucket.label}</span>
                    <span className="text-[#666666]">{bucket.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f5f5f5]">
                    <div
                      className="h-full rounded-full bg-[#0f766e]"
                      style={{ width: `${Math.max(6, (bucket.value / maxTopCity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Pages" value={snapshot.pagesTotal} subtitle={`${snapshot.pagesAdded30Days} added in last 30 days`} />
        <MetricCard title="Published Pages" value={snapshot.pagesPublished} subtitle={`${snapshot.publishRate}% publish rate`} colorClass="text-[#166534]" />
        <MetricCard title="Draft Pages" value={snapshot.pagesDraft} colorClass="text-[#92400e]" />
        <MetricCard
          title="Coverage"
          value={`${snapshot.pageCourseCoverage} Courses / ${snapshot.pageCityCoverage} Cities`}
          subtitle="Unique values tracked in pages"
        />
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#000000]">Recent Leads</h2>

        {loading ? (
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
            <div className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
          </div>
        ) : snapshot.recentLeads.length === 0 ? (
          <p className="mt-4 text-sm text-[#666666]">No leads available yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fafafa] text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Lead</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Course</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">City</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Status</th>
                  <th className="px-3 py-2 font-semibold text-[#111827]">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eef2f7] bg-white">
                {snapshot.recentLeads.map((row) => {
                  const normalizedStatus = normalizeStatus(row.status)
                  return (
                    <tr key={row.id} className="hover:bg-[#fafcff]">
                      <td className="px-3 py-2">
                        <p className="font-medium text-[#111827]">{row.name || row.email || row.mobile || 'Unnamed lead'}</p>
                        <p className="text-xs text-[#64748b]">{row.email || 'No email'}</p>
                      </td>
                      <td className="px-3 py-2 text-[#334155]">{row.course_interest || '—'}</td>
                      <td className="px-3 py-2 text-[#334155]">{row.city_interest || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(normalizedStatus)}`}>
                          {formatStatusLabel(normalizedStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#334155]">{formatDate(row.created_at)}</td>
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
