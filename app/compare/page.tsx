'use client'

import * as React from 'react'
import { getComparePages, removeComparePage } from '../../lib/browserStorage'
import {
  getFeaturedCollege,
  getPackageLabel,
  getPackageNumber,
  getPlacementLabel,
  getPlacementNumber,
  getTopCollegeByType,
  parseFeeLowerBound
} from '../../lib/pageMetrics'
import { supabase } from '../../lib/supabase'

function naacScore(grade: string) {
  const map: Record<string, number> = {
    'A++': 6,
    'A+': 5,
    A: 4,
    'B++': 3,
    'B+': 2,
    B: 1
  }
  return map[String(grade || '').toUpperCase()] || 0
}

function cutoffScore(cutoff: string) {
  const n = Number(String(cutoff || '').replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n)) return 0
  return -n
}

export default function ComparePage() {
  const [pages, setPages] = React.useState([] as any[])
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    const slugs = getComparePages()
    if (!slugs.length) {
      setPages([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('pages')
      .select('id, slug, page_title, h1_text, course, city, fee_range, exam_type, content_json')
      .in('slug', slugs)
      .eq('published', true)

    const bySlug: Record<string, any> = {}
    ;(data || []).forEach((r: any) => {
      bySlug[r.slug] = r
    })

    setPages(slugs.map((s) => bySlug[s]).filter(Boolean))
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

  const remove = (slug: string) => {
    removeComparePage(slug)
    setPages((prev: any[]) => prev.filter((p: any) => p.slug !== slug))
  }

  const rows = React.useMemo(() => {
    return [
      {
        label: 'Page Title',
        value: (p: any) => p.page_title || p.h1_text || p.slug,
        score: (_: any) => null
      },
      {
        label: 'Fee Range',
        value: (p: any) => p.fee_range || '—',
        score: (p: any) => -parseFeeLowerBound(p.fee_range)
      },
      {
        label: 'Exam Type',
        value: (p: any) => p.exam_type || '—',
        score: (_: any) => null
      },
      {
        label: 'Top Private College',
        value: (p: any) => {
          const c = getTopCollegeByType(p, 'private')
          return c ? `${c.name} (${c.fees || c.fees_per_year || 'N/A'})` : '—'
        },
        score: (_: any) => null
      },
      {
        label: 'Top Govt College',
        value: (p: any) => {
          const c = getTopCollegeByType(p, 'govt')
          return c ? `${c.name} (${c.fees || c.fees_per_year || 'N/A'})` : '—'
        },
        score: (_: any) => null
      },
      {
        label: 'Avg Placement %',
        value: (p: any) => getPlacementLabel(p),
        score: (p: any) => getPlacementNumber(p)
      },
      {
        label: 'Avg Package LPA',
        value: (p: any) => getPackageLabel(p),
        score: (p: any) => getPackageNumber(p)
      },
      {
        label: 'NAAC Grade (Featured)',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.naac_grade || '—'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return naacScore(c?.naac_grade)
        }
      },
      {
        label: 'Difficulty Score',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.difficulty_score ?? '—'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return -Number(c?.difficulty_score || 0)
        }
      },
      {
        label: 'Value Score',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.value_score ?? '—'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return Number(c?.value_score || 0)
        }
      },
      {
        label: 'Scholarship Available',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.has_scholarship || c?.scholarship_available ? 'Yes' : 'No'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.has_scholarship || c?.scholarship_available ? 1 : 0
        }
      },
      {
        label: 'Hostel Available',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.has_hostel || c?.hostel_available ? 'Yes' : 'No'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.has_hostel || c?.hostel_available ? 1 : 0
        }
      },
      {
        label: 'Class 12 Cutoff',
        value: (p: any) => {
          const c = getFeaturedCollege(p)
          return c?.cutoff || c?.cutoff_class12 || '—'
        },
        score: (p: any) => {
          const c = getFeaturedCollege(p)
          return cutoffScore(c?.cutoff || c?.cutoff_class12)
        }
      }
    ]
  }, [])

  if (loading) {
    return <main className="rounded-lg bg-white p-8 text-center text-[#666666]">Loading comparison...</main>
  }

  if (pages.length === 0) {
    return (
      <main className="rounded-lg bg-white p-12 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#000000]">No pages selected for comparison</h1>
        <p className="mt-2 text-[#666666]">Add up to 3 colleges from cards and compare them here.</p>
        <a href="/" className="mt-4 inline-block rounded-md bg-[#fca311] px-4 py-2 text-sm font-medium text-white">Browse Colleges</a>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <div>
          <h1 className="text-3xl font-extrabold">Compare Colleges</h1>
          <p className="mt-1 text-sm text-[#666666]">Side-by-side comparison for smarter college decisions.</p>
        </div>
        {pages.length < 3 && (
          <a href="/" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#14213d]">Add Another</a>
        )}
      </header>

      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-[#fafafa]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[#000000]">Metric</th>
              {pages.map((p: any) => (
                <th key={p.slug} className="px-4 py-3 text-left font-semibold text-[#000000]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="line-clamp-2">{p.page_title || p.h1_text || p.slug}</div>
                      <div className="mt-1 text-xs font-normal text-[#666666]">{p.course || 'Course'} • {p.city || 'City'}</div>
                    </div>
                    <button onClick={() => remove(p.slug)} className="rounded border border-[#e5e5e5] px-2 py-1 text-xs text-[#666666] hover:bg-[#f5f5f5]">Remove</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {rows.map((row: any) => {
              const scores = pages.map((p: any) => row.score(p))
              const validScores = scores.filter((s: any) => typeof s === 'number')
              const best = validScores.length ? Math.max(...validScores) : null

              return (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-[#333333]">{row.label}</td>
                  {pages.map((p: any, idx: number) => {
                    const score = scores[idx]
                    const isBest = best != null && typeof score === 'number' && score === best
                    return (
                      <td key={p.slug + row.label} className={`px-4 py-3 text-[#333333] ${isBest ? 'bg-[#f5f7fb]' : ''}`}>
                        {row.value(p)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
