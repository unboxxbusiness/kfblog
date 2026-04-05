'use client'

import { usePathname } from 'next/navigation'
import RecentlyViewed from './RecentlyViewed'
import ExamCountdown from './ExamCountdown'

export default function PathAwareWidgets() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) return null

  return (
    <section className="mt-10 space-y-6">
      <RecentlyViewed />
      <div className="hidden lg:block">
        <ExamCountdown />
      </div>
    </section>
  )
}
