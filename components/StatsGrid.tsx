import React from 'react'

export default function StatsGrid({ stats }: { stats?: Array<{ label: string; value: string | number }> }) {
  if (!stats || stats.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {stats.map((s, i) => (
        <div key={i} className="rounded-lg bg-[#fafafa] p-4 shadow-sm">
          <div className="text-sm text-[#666666]">{s.label}</div>
          <div className="mt-1 text-xl font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
