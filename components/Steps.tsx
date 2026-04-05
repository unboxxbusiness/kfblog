import React from 'react'

export default function Steps({ steps }: { steps?: Array<{ title: string; description?: string }> }) {
  if (!steps || steps.length === 0) return null
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fca311] text-sm font-semibold text-white">{i + 1}</div>
          <div>
            <div className="font-medium">{s.title}</div>
            {s.description && <div className="text-sm text-[#333333]">{s.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}
