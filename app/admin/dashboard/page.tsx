import { addDays, format, startOfDay, startOfWeek, subDays } from 'date-fns'
import { Suspense } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import AdminDashboardClient from '../../../components/admin/AdminDashboardClient'
import { createAdminClient } from '../../../lib/admin-auth'

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
  error: string | null
}

function toTopBuckets(values: Array<string | null | undefined>, limit = 10): ChartDatum[] {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    const label = String(value || '').trim()
    if (!label) return
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function buildTimeline90(createdAtRows: Array<{ created_at: string | null }>, now: Date): TimeDatum[] {
  const counts = new Map<string, number>()
  createdAtRows.forEach((row) => {
    if (!row.created_at) return
    const key = format(new Date(row.created_at), 'yyyy-MM-dd')
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const today = startOfDay(now)
  const points: TimeDatum[] = []

  for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
    const date = subDays(today, daysAgo)
    const key = format(date, 'yyyy-MM-dd')
    points.push({
      date: key,
      label: format(date, 'MMM d'),
      count: counts.get(key) || 0,
    })
  }

  return points
}

async function getDashboardClient() {
  const adminClientResult = createAdminClient()

  if (adminClientResult.data) {
    return { client: adminClientResult.data, initError: null as string | null }
  }

  try {
    const cookieStore = await cookies()
    const getCookieStore = (() => cookieStore) as unknown as () => ReturnType<typeof cookies>
    const sessionClient = createServerComponentClient({
      cookies: getCookieStore,
    })

    return {
      client: sessionClient,
      initError: null as string | null,
    }
  } catch (err) {
    return {
      client: null,
      initError: adminClientResult.error || (err instanceof Error ? err.message : 'Unable to initialize dashboard client'),
    }
  }
}

async function getDashboardPayload(): Promise<DashboardPayload> {
  const clientResult = await getDashboardClient()
  if (!clientResult.client) {
    return {
      totalEnquiries: 0,
      newToday: 0,
      newYesterday: 0,
      newThisWeek: 0,
      statusCounts: { new: 0, contacted: 0, enrolled: 0, rejected: 0 },
      topCourses: [],
      topCities: [],
      enquiriesPerDay90: [],
      recentEnquiries: [],
      error: clientResult.initError,
    }
  }

  const client = clientResult.client
  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = addDays(todayStart, 1)
  const yesterdayStart = subDays(todayStart, 1)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const last90Start = subDays(todayStart, 89)

  const [
    totalRes,
    todayRes,
    yesterdayRes,
    thisWeekRes,
    statusNewRes,
    statusContactedRes,
    statusEnrolledRes,
    statusRejectedRes,
    coursesRes,
    citiesRes,
    timelineRes,
    recentRes,
  ] = await Promise.all([
    client.from('enquiries').select('id', { count: 'exact', head: true }),
    client.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()).lt('created_at', tomorrowStart.toISOString()),
    client.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
    client.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'contacted'),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'enrolled'),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    client.from('enquiries').select('course_interest'),
    client.from('enquiries').select('city_interest'),
    client.from('enquiries').select('created_at').gte('created_at', last90Start.toISOString()),
    client
      .from('enquiries')
      .select('id, name, email, mobile, course_interest, city_interest, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const error =
    totalRes.error?.message ||
    todayRes.error?.message ||
    yesterdayRes.error?.message ||
    thisWeekRes.error?.message ||
    statusNewRes.error?.message ||
    statusContactedRes.error?.message ||
    statusEnrolledRes.error?.message ||
    statusRejectedRes.error?.message ||
    coursesRes.error?.message ||
    citiesRes.error?.message ||
    timelineRes.error?.message ||
    recentRes.error?.message ||
    null

  if (error) {
    return {
      totalEnquiries: 0,
      newToday: 0,
      newYesterday: 0,
      newThisWeek: 0,
      statusCounts: { new: 0, contacted: 0, enrolled: 0, rejected: 0 },
      topCourses: [],
      topCities: [],
      enquiriesPerDay90: [],
      recentEnquiries: [],
      error,
    }
  }

  const payload: DashboardPayload = {
    totalEnquiries: Number(totalRes.count || 0),
    newToday: Number(todayRes.count || 0),
    newYesterday: Number(yesterdayRes.count || 0),
    newThisWeek: Number(thisWeekRes.count || 0),
    statusCounts: {
      new: Number(statusNewRes.count || 0),
      contacted: Number(statusContactedRes.count || 0),
      enrolled: Number(statusEnrolledRes.count || 0),
      rejected: Number(statusRejectedRes.count || 0),
    },
    topCourses: toTopBuckets((coursesRes.data || []).map((row: any) => row.course_interest), 10),
    topCities: toTopBuckets((citiesRes.data || []).map((row: any) => row.city_interest), 10),
    enquiriesPerDay90: buildTimeline90((timelineRes.data || []) as Array<{ created_at: string | null }>, now),
    recentEnquiries: (recentRes.data || []) as RecentEnquiry[],
    error: null,
  }

  return payload
}

export default async function AdminDashboardPage() {
  const payload = await getDashboardPayload()

  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl border border-[#e5e5e5] bg-white" />}>
      <AdminDashboardClient payload={payload} />
    </Suspense>
  )
}
