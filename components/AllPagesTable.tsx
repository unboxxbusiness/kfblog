'use client'

import * as React from 'react'
import Link from 'next/link'

type PageRow = any

function getPlacement(page: PageRow) {
  const stats = page.content_json?.intro?.stats || []
  const found = (stats || []).find((s: any) => /placement/i.test(s.label || ''))
  return found ? Number(found.value) || 0 : 0
}
function getPackage(page: PageRow) {
  const stats = page.content_json?.intro?.stats || []
  const found = (stats || []).find((s: any) => /package|lpa/i.test(s.label || ''))
  return found ? String(found.value) : 'N/A'
}

export default function AllPagesTable({ pages }: { pages: PageRow[] }) {
  const [sortKey, setSortKey] = React.useState('city' as string)
  const [asc, setAsc] = React.useState(true as boolean)

  const sorted = React.useMemo(() => {
    const copy = [...pages]
    copy.sort((a: any, b: any) => {
      let va: any = a[sortKey]
      let vb: any = b[sortKey]

      if (sortKey === 'placement') {
        va = getPlacement(a)
        vb = getPlacement(b)
      }
      if (sortKey === 'avg_package') {
        va = getPackage(a)
        vb = getPackage(b)
      }

      if (typeof va === 'string') va = va.toString().toLowerCase()
      if (typeof vb === 'string') vb = vb.toString().toLowerCase()

      if (va < vb) return asc ? -1 : 1
      if (va > vb) return asc ? 1 : -1
      return 0
    })
    return copy
  }, [pages, sortKey, asc])

  function toggleSort(key: string) {
    if (key === sortKey) setAsc(!asc)
    else {
      setSortKey(key)
      setAsc(true)
    }
  }

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[#fafafa]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold cursor-pointer" onClick={() => toggleSort('city')}>City</th>
            <th className="px-4 py-3 text-left font-semibold cursor-pointer" onClick={() => toggleSort('fee_range')}>Fee Range</th>
            <th className="px-4 py-3 text-left font-semibold cursor-pointer" onClick={() => toggleSort('exam_type')}>Exam Type</th>
            <th className="px-4 py-3 text-left font-semibold cursor-pointer" onClick={() => toggleSort('placement')}>Avg Placement</th>
            <th className="px-4 py-3 text-left font-semibold cursor-pointer" onClick={() => toggleSort('avg_package')}>Avg Package</th>
            <th className="px-4 py-3 text-left font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((p: any) => (
            <tr key={p.id} className="hover:bg-[#fafafa]">
              <td className="px-4 py-3">{p.city}</td>
              <td className="px-4 py-3">{p.fee_range || '—'}</td>
              <td className="px-4 py-3">{p.exam_type || '—'}</td>
              <td className="px-4 py-3">{getPlacement(p) || '—'}%</td>
              <td className="px-4 py-3">{getPackage(p)}</td>
              <td className="px-4 py-3">
                <Link href={`/colleges/${p.slug}`} prefetch className="inline-flex items-center rounded-md bg-[#fca311] px-3 py-1 text-sm font-medium text-white">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
