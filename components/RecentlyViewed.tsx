'use client'

import * as React from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getRecentlyViewed } from '../lib/browserStorage'

type PageLite = {
  id: string
  slug: string
  page_title?: string | null
  course?: string | null
  city?: string | null
  fee_range?: string | null
}

export default function RecentlyViewed() {
  const [pages, setPages] = React.useState([] as PageLite[])

  React.useEffect(() => {
    const load = async () => {
      const slugs = getRecentlyViewed()
      if (!slugs.length) {
        setPages([])
        return
      }

      const { data } = await supabase
        .from('pages')
        .select('id, slug, page_title, course, city, fee_range')
        .in('slug', slugs)
        .eq('published', true)

      const rows = (data || []) as PageLite[]
      const bySlug: Record<string, PageLite> = {}
      rows.forEach((r) => {
        bySlug[r.slug] = r
      })
      setPages(slugs.map((s) => bySlug[s]).filter(Boolean))
    }

    load()

    const reload = () => load()
    window.addEventListener('storage', reload)
    window.addEventListener('kf:storage', reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener('kf:storage', reload)
    }
  }, [])

  if (!pages.length) return null

  return (
    <section className="mt-12 rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-[#000000]">Recently Viewed</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {pages.map((p: PageLite) => (
          <Link key={p.id} href={`/colleges/${p.slug}`} prefetch className="min-w-[240px] rounded-lg border border-[#e5e5e5] p-3 hover:border-[#29447e] hover:shadow-sm">
            <p className="line-clamp-2 text-sm font-semibold text-[#000000]">{p.page_title || p.slug}</p>
            <p className="mt-1 text-xs text-[#666666]">{p.course || 'Course'} • {p.city || 'City'}</p>
            <p className="mt-2 text-xs text-[#14213d]">{p.fee_range || 'Fee info'}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
