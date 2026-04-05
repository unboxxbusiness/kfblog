'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type CommandPaletteSearchProps = {
  placeholder?: string
  className?: string
}

export default function CommandPaletteSearch({
  placeholder = 'Search colleges, course, city...',
  className = ''
}: CommandPaletteSearchProps) {
  const searchParams = useSearchParams()
  const [q, setQ] = React.useState(searchParams.get('q') || '')
  const submitLinkRef = React.useRef<HTMLAnchorElement | null>(null)

  const searchHref = React.useMemo(() => {
    const value = String(q || '').trim()
    return value ? `/search?q=${encodeURIComponent(value)}` : '/search'
  }, [q])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitLinkRef.current?.click()
  }

  return (
    <form onSubmit={submit} className={className}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-[#e5e5e5] bg-white px-3 text-sm focus:border-[#14213d] focus:outline-none focus:ring-2 focus:ring-[#29447e]/25"
      />
      <Link ref={submitLinkRef} href={searchHref} prefetch className="sr-only">
        Search
      </Link>
    </form>
  )
}
