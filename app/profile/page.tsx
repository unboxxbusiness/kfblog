'use client'

import * as React from 'react'
import CollegeCard from '../../components/CollegeCard'
import { getCities, getCourses, getExamTypes, getFeeRanges } from '../../lib/api'
import { getPlacementNumber } from '../../lib/pageMetrics'
import { supabase } from '../../lib/supabase'

type Profile = {
  course: string
  cities: string[]
  budget: string
  exam: string
  stream: 'PCM' | 'PCB' | 'Commerce' | 'Arts' | ''
  expectedPct: string
}

const PROFILE_KEY = 'student_profile'

const initialProfile: Profile = {
  course: '',
  cities: [],
  budget: '',
  exam: '',
  stream: '',
  expectedPct: ''
}

function streamCourseMatch(stream: string, course: string) {
  const c = String(course || '').toLowerCase()
  if (!stream) return false
  if (stream === 'PCM') return /engineering|btech|jee|technology|computer|science/.test(c)
  if (stream === 'PCB') return /medical|mbbs|bds|neet|nursing|pharma|biotech/.test(c)
  if (stream === 'Commerce') return /bcom|commerce|bba|mba|finance|account/.test(c)
  if (stream === 'Arts') return /ba|arts|design|law|humanities|journalism/.test(c)
  return false
}

function getCutoffNumber(page: any) {
  const featured = Array.isArray(page?.content_json?.colleges)
    ? page.content_json.colleges.find((c: any) => c?.is_featured) || page.content_json.colleges[0]
    : null
  if (!featured) return null
  const raw = featured.cutoff || featured.cutoff_class12 || ''
  const n = Number(String(raw).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function matchScore(page: any, profile: Profile) {
  let total = 0
  let hit = 0

  if (profile.course) {
    total += 25
    if (String(page.course || '').toLowerCase() === profile.course.toLowerCase()) hit += 25
  }
  if (profile.cities.length) {
    total += 20
    if (profile.cities.map((c) => c.toLowerCase()).includes(String(page.city || '').toLowerCase())) hit += 20
  }
  if (profile.budget) {
    total += 20
    if (String(page.fee_range || '').toLowerCase() === profile.budget.toLowerCase()) hit += 20
  }
  if (profile.exam) {
    total += 15
    if (String(page.exam_type || '').toLowerCase().includes(profile.exam.toLowerCase())) hit += 15
  }
  if (profile.stream) {
    total += 10
    if (streamCourseMatch(profile.stream, page.course || '')) hit += 10
  }
  if (profile.expectedPct) {
    total += 10
    const cutoff = getCutoffNumber(page)
    const pct = Number(profile.expectedPct)
    if (cutoff == null || (Number.isFinite(pct) && pct >= cutoff)) hit += 10
  }

  if (!total) return 0
  return Math.round((hit / total) * 100)
}

export default function ProfilePage() {
  const [profile, setProfile] = React.useState({ ...initialProfile })
  const [saved, setSaved] = React.useState(false)

  const [courses, setCourses] = React.useState([] as string[])
  const [cities, setCities] = React.useState([] as string[])
  const [feeRanges, setFeeRanges] = React.useState([] as string[])
  const [examTypes, setExamTypes] = React.useState([] as string[])

  const [loading, setLoading] = React.useState(false)
  const [recommendations, setRecommendations] = React.useState([] as Array<any>)

  React.useEffect(() => {
    const load = async () => {
      const [c1, c2, f, e] = await Promise.all([getCourses(), getCities(), getFeeRanges(), getExamTypes()])
      setCourses(c1)
      setCities(c2)
      setFeeRanges(f)
      setExamTypes(e)
    }
    load()

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(PROFILE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          setProfile({ ...initialProfile, ...parsed })
          setSaved(true)
        }
      } catch {
        // ignore malformed profile
      }
    }
  }, [])

  const runRecommendations = React.useCallback(async (p: Profile) => {
    setLoading(true)

    let query = supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, page_title, h1_text, content_json')
      .eq('published', true)
      .limit(120)

    if (p.course) query = query.eq('course', p.course)
    if (p.cities.length > 0) query = query.in('city', p.cities)
    if (p.budget) query = query.eq('fee_range', p.budget)
    if (p.exam) query = query.ilike('exam_type', `%${p.exam}%`)

    const { data, error } = await query
    if (error) {
      setRecommendations([])
      setLoading(false)
      return
    }

    const rows = (data || []).map((row: any) => ({
      page: row,
      score: matchScore(row, p),
      placement: getPlacementNumber(row)
    }))

    rows.sort((a: any, b: any) => (b.score - a.score) || (b.placement - a.placement))
    setRecommendations(rows.slice(0, 6))
    setLoading(false)
  }, [])

  React.useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => {
      runRecommendations(profile)
    }, 300)
    return () => window.clearTimeout(id)
  }, [profile, saved, runRecommendations])

  const update = (patch: Partial<Profile>) => setProfile((prev: Profile) => ({ ...prev, ...patch }))

  const toggleCity = (city: string) => {
    setProfile((prev: Profile) => {
      const exists = prev.cities.includes(city)
      if (exists) return { ...prev, cities: prev.cities.filter((c) => c !== city) }
      if (prev.cities.length >= 3) return prev
      return { ...prev, cities: [...prev.cities, city] }
    })
  }

  const saveProfile = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    }
    setSaved(true)
    runRecommendations(profile)
  }

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Student Profile</h1>
        <p className="mt-2 text-[#666666]">Set your preferences and get personalized college recommendations.</p>
      </header>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">Preferred Course</label>
            <select value={profile.course} onChange={(e: any) => update({ course: e.target.value })} className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm">
              <option value="">Select course</option>
              {courses.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">Budget / Fee Range</label>
            <select value={profile.budget} onChange={(e: any) => update({ budget: e.target.value })} className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm">
              <option value="">Select budget</option>
              {feeRanges.map((f: string) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">Exam appearing for</label>
            <select value={profile.exam} onChange={(e: any) => update({ exam: e.target.value })} className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm">
              <option value="">Select exam</option>
              {examTypes.map((e: string) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">Class 12 Stream</label>
            <select value={profile.stream} onChange={(e: any) => update({ stream: e.target.value as Profile['stream'] })} className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm">
              <option value="">Select stream</option>
              <option value="PCM">PCM</option>
              <option value="PCB">PCB</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#333333]">Class 12 Expected %</label>
            <input
              value={profile.expectedPct}
              onChange={(e: any) => update({ expectedPct: e.target.value })}
              type="number"
              min="0"
              max="100"
              className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[#333333]">Preferred City (up to 3)</label>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[#e5e5e5] p-3">
              {cities.map((c: string) => {
                const selected = profile.cities.includes(c)
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleCity(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? 'bg-[#fca311] text-white' : 'bg-[#f5f5f5] text-[#333333]'}`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={saveProfile} className="rounded-md bg-[#fca311] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d68502]">
            Save Profile
          </button>
        </div>
      </section>

      {saved && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[#000000]">Recommended For You</h2>
          {loading ? (
            <div className="rounded-lg bg-white p-6 text-center text-[#666666]">Refreshing recommendations...</div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center text-[#666666]">No recommendations found for current preferences.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {recommendations.map((row: any) => (
                <div key={row.page.id}>
                  <div className="mb-2 text-xs font-semibold text-[#14213d]">Match Score: {row.score}%</div>
                  <CollegeCard page={row.page} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
