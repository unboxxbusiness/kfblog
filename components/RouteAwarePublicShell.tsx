'use client'

import { usePathname } from 'next/navigation'
import Navbar from './navbar'
import Footer from './Footer'
import CompareNowBar from './CompareNowBar'
import GlobalRecentlyViewedTracker from './GlobalRecentlyViewedTracker'
import PathAwareWidgets from './PathAwareWidgets'

export default function RouteAwarePublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPathReady = typeof pathname === 'string' && pathname.length > 0
  const isAdmin = isPathReady && pathname.startsWith('/admin')
  const isHome = pathname === '/'

  if (!isPathReady || isAdmin) {
    return <>{children}</>
  }

  if (isHome) {
    return (
      <>
        <Navbar />
        {children}
        <Footer />
        <GlobalRecentlyViewedTracker />
        <CompareNowBar />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
        <PathAwareWidgets />
      </main>
      <Footer />
      <GlobalRecentlyViewedTracker />
      <CompareNowBar />
    </>
  )
}
