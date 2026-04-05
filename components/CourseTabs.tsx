'use client'

import React from 'react'

export default function CourseTabs({
  courses,
  active,
  onSelect
}: {
  courses: string[]
  active: string | null
  onSelect: (c: string | null) => void
}) {

  return (
    <div className="overflow-x-auto py-2">
      <div className="flex gap-3 px-2">
        {courses.map((c) => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${active === c ? 'bg-[#fca311] text-white' : 'bg-[#f5f5f5] text-[#333333]'}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
