'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { addRecentlyViewed } from '../lib/browserStorage'

export default function GlobalRecentlyViewedTracker() {
  const pathname = usePathname()

  React.useEffect(() => {
    if (!pathname) return

    const m = pathname.match(/^\/colleges\/([^/?#]+)/)
    if (m && m[1]) {
      addRecentlyViewed(decodeURIComponent(m[1]))
    }
  }, [pathname])

  return null
}
