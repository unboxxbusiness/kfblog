'use client'

import * as React from 'react'
import CollegeCard from '../../components/CollegeCard'
import { removeSavedPage, getSavedPages } from '../../lib/browserStorage'
import { getPlacementNumber } from '../../lib/pageMetrics'
import { supabase } from '../../lib/supabase'

type SortKey = 'date' | 'course' | 'city' | 'placement'

export default function SavedPage() {
  const [pages, setPages] = React.useState([] as any[])
  const [savedEntries, setSavedEntries] = React.useState([] as { slug: string; savedAt: number }[])
  const [sortBy, setSortBy] = React.useState('date' as SortKey)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    const entries = getSavedPages()
    setSavedEntries(entries)

    if (!entries.length) {
      setPages([])
      setLoading(false)
      return
    }

    const slugs = entries.map((e) => e.slug)
    const { data } = await supabase
      .from('pages')
      .select('id, slug, course, city, fee_range, exam_type, page_title, h1_text, content_json, created_at')
      .in('slug', slugs)
      .eq('published', true)

    const rows = data || []
    const bySlug: Record<string, any> = {}
    rows.forEach((r: any) => {
      bySlug[r.slug] = r
    })

    const ordered = slugs.map((s) => bySlug[s]).filter(Boolean)
    setPages(ordered)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    load()
    const reload = () => load()
    window.addEventListener('storage', reload)
    window.addEventListener('kf:storage', reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener('kf:storage', reload)
    }
  }, [load])

  const sorted = React.useMemo(() => {
    const copy = [...pages]
    const savedAtMap: Record<string, number> = {}
    savedEntries.forEach((e: { slug: string; savedAt: number }) => {
      savedAtMap[e.slug] = e.savedAt
    })

    copy.sort((a: any, b: any) => {
      if (sortBy === 'date') return (savedAtMap[b.slug] || 0) - (savedAtMap[a.slug] || 0)
      if (sortBy === 'course') return String(a.course || '').localeCompare(String(b.course || ''))
      if (sortBy === 'city') return String(a.city || '').localeCompare(String(b.city || ''))
      if (sortBy === 'placement') return getPlacementNumber(b) - getPlacementNumber(a)
      return 0
    })

    return copy
  }, [pages, savedEntries, sortBy])

  const onRemove = (slug: string) => {
    removeSavedPage(slug)
    setPages((prev: any[]) => prev.filter((p: any) => p.slug !== slug))
    setSavedEntries((prev: { slug: string; savedAt: number }[]) => prev.filter((e: { slug: string; savedAt: number }) => e.slug !== slug))
  }

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Saved Colleges</h1>
        <p className="mt-2 text-[#666666]">Your bookmarked college pages are stored locally in this browser.</p>
      </header>

      <section className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-white p-4">
        <p className="text-sm text-[#666666]">{sorted.length} saved page{sorted.length === 1 ? '' : 's'}</p>
        <label className="text-sm text-[#333333]">
          Sort by:{' '}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value as SortKey)}
            className="rounded-md border border-[#e5e5e5] px-2 py-1"
          >
            <option value="date">Date Saved</option>
            <option value="course">Course</option>
            <option value="city">City</option>
            <option value="placement">Avg Placement</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-[#666666]">Loading saved colleges...</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <h3 className="text-xl font-semibold text-[#000000]">No saved colleges yet.</h3>
          <p className="mt-2 text-[#666666]">Browse and bookmark colleges you like.</p>
          <a href="/" className="mt-4 inline-block rounded-md bg-[#fca311] px-4 py-2 text-sm font-medium text-white">Browse Colleges</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {sorted.map((p: any) => (
            <div key={p.id}>
              <CollegeCard page={p} showRemove onRemove={onRemove} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
