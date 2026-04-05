'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Bell,
  Clock,
  Download,
  ExternalLink,
  GraduationCap,
  Phone,
  Users,
  XCircle,
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import StatsCard from './StatsCard'
import ChartWrapper from './ChartWrapper'
import { downloadCsv } from '../../lib/csvExport'

type ChartDatum = { label: string; count: number }

type TimeDatum = { date: string; label: string; count: number }

type RecentEnquiry = {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  course_interest: string | null
  city_interest: string | null
  status: string | null
  created_at: string | null
}

type DashboardPayload = {
  totalEnquiries: number
  newToday: number
  newYesterday: number
  newThisWeek: number
  statusCounts: {
    new: number
    contacted: number
    enrolled: number
    rejected: number
  }
  topCourses: ChartDatum[]
  topCities: ChartDatum[]
  enquiriesPerDay90: TimeDatum[]
  recentEnquiries: RecentEnquiry[]
  error?: string | null
}

function statusColor(status: string) {
  const normalized = String(status || 'new').toLowerCase()
  if (normalized === 'contacted') return 'bg-[#f5f7fb] text-[#14213d]'
  if (normalized === 'enrolled') return 'bg-[#ecfdf5] text-[#1f7a1f]'
  if (normalized === 'rejected') return 'bg-[#fff1f2] text-[#d64545]'
  return 'bg-[#fff8ec] text-[#d68502]'
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Number(((part / total) * 100).toFixed(1))
}

export default function AdminDashboardClient({ payload }: { payload: DashboardPayload }) {
  const supabase = createClientComponentClient()
  const [period, setPeriod] = React.useState<'7D' | '30D' | '90D'>('30D')
  const [chartsLoading, setChartsLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = React.useState<RecentEnquiry | null>(null)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setChartsLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [])

  const chartWindow = React.useMemo(() => {
    if (period === '7D') return payload.enquiriesPerDay90.slice(-7)
    if (period === '30D') return payload.enquiriesPerDay90.slice(-30)
    return payload.enquiriesPerDay90
  }, [period, payload.enquiriesPerDay90])

  const hasTimelineData = React.useMemo(() => chartWindow.some((point) => point.count > 0), [chartWindow])
  const hasCourseData = payload.topCourses.length > 0
  const hasCityData = payload.topCities.length > 0
  const hasStatusData = React.useMemo(
    () => Object.values(payload.statusCounts).some((value) => value > 0),
    [payload.statusCounts]
  )

  const donutData = React.useMemo(
    () => [
      { name: 'New', value: payload.statusCounts.new, color: '#14213d' },
      { name: 'Contacted', value: payload.statusCounts.contacted, color: '#f59e0b' },
      { name: 'Enrolled', value: payload.statusCounts.enrolled, color: '#16a34a' },
      { name: 'Rejected', value: payload.statusCounts.rejected, color: '#dc2626' },
    ],
    [payload.statusCounts]
  )

  const contactedRate = pct(payload.statusCounts.contacted, payload.totalEnquiries)
  const enrolledFromContacted = pct(payload.statusCounts.enrolled, payload.statusCounts.contacted)

  const exportAllLeads = async () => {
    if (exporting) return
    setExporting(true)

    const { data, error } = await supabase
      .from('enquiries')
      .select('name, email, mobile, course_interest, city_interest, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Unable to export leads right now.')
      setExporting(false)
      return
    }

    const rows = (data || []).map((row: any) => ({
      Name: row.name || '',
      Email: row.email || '',
      Mobile: row.mobile || '',
      Course: row.course_interest || '',
      City: row.city_interest || '',
      Status: row.status || '',
      CreatedAt: row.created_at || '',
    }))

    downloadCsv({
      rows: rows as Array<Record<string, unknown>>,
      headers: ['Name', 'Email', 'Mobile', 'Course', 'City', 'Status', 'CreatedAt'],
      filename: `kampus-leads-${new Date().toISOString().slice(0, 10)}.csv`,
    })

    toast.success(`Exported ${rows.length} lead${rows.length === 1 ? '' : 's'}.`)
    setExporting(false)
  }

  const funnelSteps = [
    { label: 'Total Enquiries', value: payload.totalEnquiries },
    { label: 'Contacted', value: payload.statusCounts.contacted },
    { label: 'Enrolled', value: payload.statusCounts.enrolled },
  ]

  const dropOffContact = pct(payload.totalEnquiries - payload.statusCounts.contacted, payload.totalEnquiries)
  const dropOffEnroll = pct(payload.statusCounts.contacted - payload.statusCounts.enrolled, payload.statusCounts.contacted)

  return (
    <div className="space-y-6">
      {payload.error ? (
        <section className="rounded-2xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3">
          <p className="text-sm font-semibold text-[#b91c1c]">Dashboard data issue</p>
          <p className="mt-1 text-xs text-[#7f1d1d]">{payload.error}</p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          title="Total Leads"
          value={payload.totalEnquiries}
          trendText={`+${payload.newThisWeek} this week`}
          icon={Users}
          borderColor="#14213d"
          iconBg="#eef2f8"
          iconColor="#14213d"
        />

        <StatsCard
          title="New Today"
          value={payload.newToday}
          trendText={`vs ${payload.newYesterday} yesterday`}
          icon={Bell}
          borderColor="#dc2626"
          iconBg="#fee2e2"
          iconColor="#dc2626"
          href="/admin/leads?filter=today"
          pulseDot={payload.newToday > 0}
        />

        <StatsCard
          title="Contacted"
          value={payload.statusCounts.contacted}
          subtitle={`${contactedRate}% of total`}
          icon={Phone}
          borderColor="#f59e0b"
          iconBg="#fef3c7"
          iconColor="#d97706"
        />

        <StatsCard
          title="Enrolled"
          value={payload.statusCounts.enrolled}
          subtitle={`${enrolledFromContacted}% conversion from contacted`}
          icon={GraduationCap}
          borderColor="#16a34a"
          iconBg="#dcfce7"
          iconColor="#15803d"
        />

        <StatsCard
          title="Awaiting Action"
          value={payload.statusCounts.new}
          icon={Clock}
          borderColor="#dc2626"
          iconBg="#fee2e2"
          iconColor="#dc2626"
          badgeText={payload.statusCounts.new > 10 ? 'High backlog' : undefined}
          href="/admin/leads?status=new"
        />

        <StatsCard
          title="Rejected"
          value={payload.statusCounts.rejected}
          icon={XCircle}
          borderColor="#dc2626"
          iconBg="#fee2e2"
          iconColor="#dc2626"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartWrapper
          title={`Enquiries — Last ${period}`}
          loading={chartsLoading}
          empty={!hasTimelineData}
          emptyMessage="Enquiries will start plotting here as new leads come in."
          className="xl:col-span-1"
          actions={
            <div className="inline-flex rounded-md border border-[#e5e5e5] bg-white p-0.5 text-xs">
              {(['7D', '30D', '90D'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded px-2.5 py-1 ${period === p ? 'bg-[#14213d] text-white' : 'text-[#333333]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartWindow}>
              <defs>
                <linearGradient id="enquiriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14213d" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#14213d" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
              <XAxis dataKey="label" stroke="var(--chart-axis-color)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--chart-axis-color)" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: any, _name: any, meta: any) => [`${value} enquiries`, `on ${meta?.payload?.label || ''}`]}
                contentStyle={{ borderRadius: 10, borderColor: '#e5e7eb' }}
              />
              <Area type="monotone" dataKey="count" stroke="#14213d" fill="url(#enquiriesFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Top Courses by Enquiries"
          loading={chartsLoading}
          empty={!hasCourseData}
          emptyMessage="Course distribution appears after leads choose course interests."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payload.topCourses} layout="vertical" margin={{ left: 10, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={120} stroke="var(--chart-axis-color)" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [`${v} enquiries`, 'Count']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {payload.topCourses.map((_, idx) => (
                  <Cell key={idx} fill={`rgba(20,33,61,${Math.max(0.35, 1 - idx * 0.06)})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Enquiries by Status"
          loading={chartsLoading}
          empty={!hasStatusData}
          emptyMessage="Status split appears once leads move through your workflow."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                {donutData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [`${v} (${pct(Number(v), payload.totalEnquiries)}%)`, n]} />
              <Legend />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-[#000000] text-base font-semibold">
                {payload.totalEnquiries}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper
          title="Top Cities by Enquiries"
          loading={chartsLoading}
          empty={!hasCityData}
          emptyMessage="City insights appear after leads select preferred cities."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payload.topCities} layout="vertical" margin={{ left: 10, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={120} stroke="var(--chart-axis-color)" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [`${v} enquiries`, 'Count']} />
              <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#000000]">Recent Enquiries</h3>
            <a href="/admin/leads" className="text-xs font-medium text-[#14213d] hover:text-[#29447e]">
              View All Enquiries →
            </a>
          </div>

          <div className="space-y-2">
            {payload.recentEnquiries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#dbe3f1] bg-[#f8fbff] p-5 text-center">
                <p className="text-sm font-medium text-[#1e293b]">No enquiries yet</p>
                <p className="mt-1 text-xs text-[#64748b]">Recent lead activity will show up here once submissions begin.</p>
              </div>
            ) : (
              payload.recentEnquiries.map((item) => (
                <article key={item.id} className="flex items-start justify-between rounded-lg border border-[#e5e5e5] p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2f8] text-sm font-semibold text-[#14213d]">
                      {String(item.name || item.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#000000]">
                        {item.name || item.email || 'Unnamed user'} applied for {item.course_interest || 'Unknown course'} in {item.city_interest || 'Unknown city'}
                      </p>
                      <p className="mt-1 text-xs text-[#666666]">
                        {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'just now'}
                      </p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(item.status || 'new')}`}>
                        {String(item.status || 'new')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(item)}
                    className="text-xs font-medium text-[#14213d] hover:text-[#29447e]"
                  >
                    View →
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#000000]">Quick Actions</h3>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={exportAllLeads}
              disabled={exporting}
              className="rounded-lg border border-[#e5e5e5] p-3 text-left hover:bg-[#fafafa]"
            >
              <p className="text-sm font-semibold text-[#000000]">Export All Leads</p>
              <p className="mt-1 text-xs text-[#666666]">Download CSV</p>
              <Download className="mt-2 h-4 w-4 text-[#14213d]" />
            </button>

            <a href="/admin/leads?status=new" className="rounded-lg border border-[#e5e5e5] p-3 hover:bg-[#fafafa]">
              <p className="text-sm font-semibold text-[#000000]">View New Leads</p>
              <p className="mt-1 text-xs text-[#666666]">Check unactioned enquiries</p>
            </a>

            <a href="/admin/settings" className="rounded-lg border border-[#e5e5e5] p-3 hover:bg-[#fafafa]">
              <p className="text-sm font-semibold text-[#000000]">Add New Admin</p>
              <p className="mt-1 text-xs text-[#666666]">Manage admin access</p>
            </a>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#e5e5e5] p-3 hover:bg-[#fafafa]"
            >
              <p className="text-sm font-semibold text-[#000000]">View Live Pages</p>
              <p className="mt-1 text-xs text-[#666666]">Open public website</p>
              <ExternalLink className="mt-2 h-4 w-4 text-[#14213d]" />
            </a>
          </div>

          <div className="mt-4 rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Conversion Funnel</h4>

            <svg viewBox="0 0 360 180" className="mt-2 w-full">
              <polygon points="20,20 340,20 280,70 80,70" fill="#e5e7eb" />
              <polygon points="80,80 280,80 240,130 120,130" fill="#cbd5e1" />
              <polygon points="120,140 240,140 210,170 150,170" fill="#94a3b8" />
              <text x="180" y="48" textAnchor="middle" className="fill-[#000000] text-[12px] font-semibold">
                {funnelSteps[0].value} Total
              </text>
              <text x="180" y="107" textAnchor="middle" className="fill-[#000000] text-[12px] font-semibold">
                {funnelSteps[1].value} Contacted
              </text>
              <text x="180" y="160" textAnchor="middle" className="fill-[#000000] text-[12px] font-semibold">
                {funnelSteps[2].value} Enrolled
              </text>
            </svg>

            <div className="mt-2 space-y-1 text-xs text-[#666666]">
              <p>Drop-off (Total → Contacted): {dropOffContact}%</p>
              <p>Drop-off (Contacted → Enrolled): {dropOffEnroll}%</p>
            </div>
          </div>
        </section>
      </section>

      {selectedEnquiry ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSelectedEnquiry(null)}
            aria-label="Close enquiry details"
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[#e5e5e5] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-[#000000]">Enquiry Detail</h3>
            <p className="mt-1 text-xs text-[#666666]">ID: {selectedEnquiry.id}</p>

            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-semibold">Name:</span> {selectedEnquiry.name || '-'}</p>
              <p><span className="font-semibold">Email:</span> {selectedEnquiry.email || '-'}</p>
              <p><span className="font-semibold">Mobile:</span> {selectedEnquiry.mobile || '-'}</p>
              <p><span className="font-semibold">Course:</span> {selectedEnquiry.course_interest || '-'}</p>
              <p><span className="font-semibold">City:</span> {selectedEnquiry.city_interest || '-'}</p>
              <p><span className="font-semibold">Status:</span> {selectedEnquiry.status || '-'}</p>
              <p>
                <span className="font-semibold">Created:</span>{' '}
                {selectedEnquiry.created_at ? new Date(selectedEnquiry.created_at).toLocaleString() : '-'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEnquiry(null)}
              className="mt-6 rounded-md bg-[#14213d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#29447e]"
            >
              Close
            </button>
          </aside>
        </>
      ) : null}
    </div>
  )
}
