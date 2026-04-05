'use client'

import * as React from 'react'
import { getComparePages, clearComparePages } from '../lib/browserStorage'

export default function CompareNowBar() {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    const sync = () => setCount(getComparePages().length)
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('kf:storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('kf:storage', sync)
    }
  }, [])

  if (count < 2) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-xl border border-[#e5e5e5] bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-[#333333]">{count} pages selected for comparison</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => clearComparePages()}
            className="rounded-md border border-[#e5e5e5] px-3 py-1.5 text-sm text-[#333333] hover:bg-[#fafafa]"
          >
            Clear
          </button>
          <a href="/compare" className="rounded-md bg-[#fca311] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#d68502]">
            Compare Now
          </a>
        </div>
      </div>
    </div>
  )
}
