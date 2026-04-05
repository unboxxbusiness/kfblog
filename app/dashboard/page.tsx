'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { getPackageNumber, getPlacementNumber, parseFeeLowerBound } from '../../lib/pageMetrics'

function countBy(rows: any[], key: string) {
  const map: Record<string, number> = {}
  rows.forEach((r: any) => {
    const k = String(r[key] || 'Unknown')
    map[k] = (map[k] || 0) + 1
  })
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}

function topN(rows: any[], n = 10) {
  return [...rows].sort((a: any, b: any) => b.value - a.value).slice(0, n)
}

function feeBucket(feeRange: any) {
  const min = parseFeeLowerBound(feeRange)
  if (!Number.isFinite(min)) return 'Other'
  if (min < 100000) return 'Under 1L'
  if (min < 300000) return '1-3L'
  if (min < 500000) return '3-5L'
  if (min < 1000000) return '5-10L'
  return 'Above 10L'
}

function normalizeExam(exam: any) {
  const v = String(exam || '').toUpperCase()
  if (v.includes('CUET')) return 'CUET'
  if (v.includes('CAT')) return 'CAT'
  if (v.includes('NEET')) return 'NEET'
  if (v.includes('JEE')) return 'JEE'
  if (v.includes('DIRECT')) return 'Direct'
  return 'Other'
}

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#94a3b8']

export default function DashboardPage() {
  const [allPages, setAllPages] = React.useState([] as any[])
  const [loading, setLoading] = React.useState(true)
  const [courseFilter, setCourseFilter] = React.useState('')
  const [cityFilter, setCityFilter] = React.useState('')

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('pages')
        .select('id, slug, course, city, fee_range, exam_type, content_json')
        .eq('published', true)
      setAllPages(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const courses = React.useMemo(() => Array.from(new Set(allPages.map((p: any) => p.course).filter(Boolean))), [allPages])
  const cities = React.useMemo(() => Array.from(new Set(allPages.map((p: any) => p.city).filter(Boolean))), [allPages])

  const pages = React.useMemo(() => {
    return allPages.filter((p: any) => {
      if (courseFilter && p.course !== courseFilter) return false
      if (cityFilter && p.city !== cityFilter) return false
      return true
    })
  }, [allPages, courseFilter, cityFilter])

  const topCourses = React.useMemo(() => topN(countBy(pages, 'course'), 10), [pages])
  const topCities = React.useMemo(() => topN(countBy(pages, 'city'), 10), [pages])

  const feeData = React.useMemo(() => {
    const map: Record<string, number> = {}
    pages.forEach((p: any) => {
      const b = feeBucket(p.fee_range)
      map[b] = (map[b] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [pages])

  const examData = React.useMemo(() => {
    const map: Record<string, number> = {}
    pages.forEach((p: any) => {
      const e = normalizeExam(p.exam_type)
      map[e] = (map[e] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [pages])

  const scatterData = React.useMemo(() => {
    return pages.map((p: any) => ({
      name: p.slug,
      placement: getPlacementNumber(p),
      package: getPackageNumber(p)
    }))
  }, [pages])

  const summary = React.useMemo(() => {
    const coursesN = new Set(pages.map((p: any) => p.course).filter(Boolean)).size
    const citiesN = new Set(pages.map((p: any) => p.city).filter(Boolean)).size
    return {
      totalPages: pages.length,
      totalCourses: coursesN,
      totalCities: citiesN,
      totalCollegesFeatured: pages.length * 5
    }
  }, [pages])

  if (loading) {
    return <main className="rounded-lg bg-white p-8 text-center text-[#666666]">Loading dashboard...</main>
  }

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Analytics Dashboard</h1>
        <p className="mt-2 text-[#666666]">Insights from all published college pages.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 text-center shadow-sm"><div className="text-2xl font-bold text-[#14213d]">{summary.totalPages}</div><div className="text-sm text-[#666666]">Total Pages</div></div>
        <div className="rounded-lg bg-white p-4 text-center shadow-sm"><div className="text-2xl font-bold text-[#14213d]">{summary.totalCourses}</div><div className="text-sm text-[#666666]">Total Courses</div></div>
        <div className="rounded-lg bg-white p-4 text-center shadow-sm"><div className="text-2xl font-bold text-[#14213d]">{summary.totalCities}</div><div className="text-sm text-[#666666]">Total Cities</div></div>
        <div className="rounded-lg bg-white p-4 text-center shadow-sm"><div className="text-2xl font-bold text-[#14213d]">{summary.totalCollegesFeatured}</div><div className="text-sm text-[#666666]">Total Colleges Featured</div></div>
      </section>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select value={courseFilter} onChange={(e: any) => setCourseFilter(e.target.value)} className="h-10 rounded-md border border-[#e5e5e5] px-3 text-sm">
            <option value="">Filter by course</option>
            {courses.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={cityFilter} onChange={(e: any) => setCityFilter(e.target.value)} className="h-10 rounded-md border border-[#e5e5e5] px-3 text-sm">
            <option value="">Filter by city</option>
            {cities.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-[#000000]">Top 10 Courses by Pages</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCourses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#6366f1" name="Pages" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-[#000000]">Top 10 Cities by Pages</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCities}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#0ea5e9" name="Pages" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-[#000000]">Fee Range Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={feeData} dataKey="value" nameKey="name" outerRadius={110} label>
                  {feeData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#e5e5e5] bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-[#000000]">Exam Type Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#14b8a6" name="Pages" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
        <h2 className="mb-3 text-lg font-bold text-[#000000]">Placement % vs Avg Package LPA</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="placement" name="Placement %" unit="%" />
              <YAxis dataKey="package" name="Avg Package" unit=" LPA" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Pages" data={scatterData} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  )
}
