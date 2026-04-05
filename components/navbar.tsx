'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'

type NavItem = { label: string; href: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Discover', href: '/search' },
  { label: 'Courses', href: '/courses' },
  { label: 'Cities', href: '/cities' },
  { label: 'Compare', href: '/compare' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e5e5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center" aria-label="Kampus Filter home">
          <Image
            src="/brand/logo-kampus-filter.webp"
            alt="Kampus Filter"
            width={180}
            height={40}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href) ? 'bg-[#14213d] text-white' : 'text-[#333333] hover:bg-[#fafafa]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/search"
            className="inline-flex h-11 items-center rounded-xl bg-[#fca311] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#d68502]"
          >
            Start
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/search"
            className="inline-flex h-11 items-center rounded-xl bg-[#fca311] px-3 text-sm font-semibold text-white"
          >
            Start
          </Link>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-[#14213d]"
                aria-label="Open menu"
                aria-controls="mobile-navigation-sheet"
                aria-expanded={menuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              id="mobile-navigation-sheet"
              side="right"
              aria-label="Mobile navigation"
              className="p-4"
            >
              <SheetHeader className="mb-4 flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-sm font-semibold text-[#14213d]">Navigation</SheetTitle>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-[#333333]"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </SheetClose>
              </SheetHeader>

              <nav className="space-y-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-11 items-center rounded-xl px-3 text-sm font-medium ${
                      isActive(item.href) ? 'bg-[#14213d] text-white' : 'border border-[#e5e5e5] text-[#333333]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-4">
                <Link
                  href="/search"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#fca311] text-sm font-semibold text-white"
                >
                  Start
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
