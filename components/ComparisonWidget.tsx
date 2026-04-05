'use client'

import * as React from 'react'
import Link from 'next/link'

export default function ComparisonWidget({ pages }: { pages: any[] }) {
  const [selected, setSelected] = React.useState([] as string[])

  function toggle(slug: string) {
    setSelected((s: string[]) => {
      if (s.includes(slug)) return s.filter((x: string) => x !== slug)
      if (s.length >= 3) return s
      return [...s, slug]
    })
  }

  const selectedPages = React.useMemo(() => pages.filter((p: any) => selected.includes(p.slug)), [pages, selected])

  function getStat(p: any, re: RegExp) {
    const stats = p.content_json?.intro?.stats || []
    const found = stats.find((s: any) => re.test(s.label || ''))
    return found ? found.value : '—'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {pages.map((p) => (
          <div key={p.slug} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium text-[#000000]">{p.page_title || p.slug}</div>
              <div className="text-xs text-[#666666]">{p.city} • {p.course} • {p.fee_range}</div>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(p.slug)} onChange={() => toggle(p.slug)} />
                <span>Compare</span>
              </label>
              <Link href={`/colleges/${p.slug}`} prefetch className="text-sm text-[#14213d]">View</Link>
            </div>
          </div>
        ))}
      </div>

      {selectedPages.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white p-4">
          <div className="flex gap-6 min-w-[700px]">
            {selectedPages.map((p: any) => (
              <div key={p.slug} className="w-64 shrink-0">
                <h4 className="font-bold">{p.page_title || p.slug}</h4>
                <div className="mt-2 text-sm text-[#666666]">Fees: {p.fee_range || '—'}</div>
                <div className="mt-1 text-sm text-[#666666]">Placement: {getStat(p, /placement/i) || '—'}</div>
                <div className="mt-1 text-sm text-[#666666]">Avg Package: {getStat(p, /package|lpa/i) || '—'}</div>
                <div className="mt-1 text-sm text-[#666666]">NAAC: {p.content_json?.colleges?.[0]?.naac_grade || '—'}</div>
                <div className="mt-1 text-sm text-[#666666]">Difficulty: {p.content_json?.colleges?.[0]?.difficulty_score || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
