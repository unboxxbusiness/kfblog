'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart2,
  Bell,
  BookOpen,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  ADMIN_NOTIFICATION_PREFS_KEY,
  DEFAULT_ADMIN_NOTIFICATION_PREFERENCES,
  type AdminNotificationPreferences,
  readAdminLastSeenAt,
  readAdminNotificationPrefs,
  writeAdminLastSeenAt,
} from '../../lib/admin-notifications'

type AdminProfile = {
  id: string
  email: string
  name: string | null
  role: string | null
}

type EnquirySearchRow = {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  created_at: string | null
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

function getBrowserNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'denied'
  }
  return Notification.permission
}

function playNotificationTone() {
  if (typeof window === 'undefined') return

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.04

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.16)

    window.setTimeout(() => {
      void context.close()
    }, 220)
  } catch {
    // Ignore playback issues for environments that block auto-played sounds.
  }
}

function formatSectionTitle(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length <= 1) return 'Dashboard'
  return parts[1]
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [profile, setProfile] = React.useState<AdminProfile | null>(null)
  const [newLeadsCount, setNewLeadsCount] = React.useState(0)
  const [pagesCount, setPagesCount] = React.useState(0)
  const [unreadNotifications, setUnreadNotifications] = React.useState(0)
  const [notificationPrefs, setNotificationPrefs] = React.useState<AdminNotificationPreferences>(
    DEFAULT_ADMIN_NOTIFICATION_PREFERENCES
  )
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission>('default')
  const [search, setSearch] = React.useState('')
  const [searchRows, setSearchRows] = React.useState<EnquirySearchRow[]>([])
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searching, setSearching] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    setNotificationPrefs(readAdminNotificationPrefs())
    setNotificationPermission(getBrowserNotificationPermission())

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_NOTIFICATION_PREFS_KEY) {
        setNotificationPrefs(readAdminNotificationPrefs())
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const navItems = React.useMemo<NavItem[]>(() => {
    return [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/leads', label: 'Leads / Enquiries', icon: Inbox, badge: newLeadsCount },
      { href: '/admin/pages', label: 'College Pages', icon: BookOpen, badge: pagesCount },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/admin/performance', label: 'Performance', icon: BarChart2 },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]
  }, [newLeadsCount, pagesCount])

  const refreshMeta = React.useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return
    }

    const [{ data: adminRow }, { count: leadsCount }, { count: totalPages }] = await Promise.all([
      supabase
        .from('admin_users')
        .select('id, email, name, role')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      supabase
        .from('pages')
        .select('id', { count: 'exact', head: true }),
    ])

    const metadataName =
      typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : null

    if (adminRow?.id) {
      setProfile({
        id: String(adminRow.id),
        email: String(adminRow.email || user.email || ''),
        name: adminRow.name ? String(adminRow.name) : metadataName,
        role: adminRow.role ? String(adminRow.role) : 'admin',
      })
    } else {
      setProfile({
        id: String(user.id),
        email: String(user.email || ''),
        name: metadataName,
        role: 'admin',
      })
    }

    setNewLeadsCount(Number(leadsCount || 0))
    setPagesCount(Number(totalPages || 0))
  }, [supabase])

  const refreshUnreadNotifications = React.useCallback(async () => {
    if (typeof window === 'undefined') return

    if (!notificationPrefs.enableInApp) {
      setUnreadNotifications(0)
      return
    }

    const lastSeen = readAdminLastSeenAt()
    if (!lastSeen) {
      writeAdminLastSeenAt(new Date().toISOString())
      setUnreadNotifications(0)
      return
    }

    const { count } = await supabase
      .from('enquiries')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', lastSeen)

    setUnreadNotifications(Number(count || 0))
  }, [notificationPrefs.enableInApp, supabase])

  React.useEffect(() => {
    void refreshMeta()
    void refreshUnreadNotifications()
  }, [refreshMeta, refreshUnreadNotifications])

  React.useEffect(() => {
    if (!notificationPrefs.enableInApp) {
      setUnreadNotifications(0)
      return
    }

    const intervalId = window.setInterval(() => {
      void refreshUnreadNotifications()
    }, 45000)

    const channel = supabase
      .channel(`admin-enquiries-live-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'enquiries' },
        (payload: any) => {
          const data = payload?.new || {}
          const leadId = String(data.id || '').trim()
          const leadName = String(data.name || data.email || 'New enquiry').trim()
          const course = String(data.course_interest || '').trim()

          setUnreadNotifications((current) => current + 1)

          if (notificationPrefs.enableToast) {
            toast.success('New enquiry received', {
              description: course ? `${leadName} for ${course}` : leadName,
              action: leadId
                ? {
                    label: 'Open',
                    onClick: () => router.push(`/admin/leads?lead=${encodeURIComponent(leadId)}`),
                  }
                : undefined,
            })
          }

          if (
            notificationPrefs.enableBrowserPush &&
            typeof window !== 'undefined' &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            const browserNotification = new Notification('New enquiry received', {
              body: course ? `${leadName} for ${course}` : leadName,
            })

            if (leadId) {
              browserNotification.onclick = () => {
                window.focus()
                router.push(`/admin/leads?lead=${encodeURIComponent(leadId)}`)
              }
            }
          }

          if (notificationPrefs.enableSound) {
            playNotificationTone()
          }
        }
      )
      .subscribe()

    return () => {
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [notificationPrefs, refreshUnreadNotifications, router, supabase])

  React.useEffect(() => {
    if (!search.trim()) {
      setSearchRows([])
      return
    }

    const clean = search.replace(/[%(),]/g, ' ').trim()
    if (!clean) {
      setSearchRows([])
      return
    }

    const timer = window.setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('enquiries')
        .select('id, name, email, mobile, created_at')
        .or(`name.ilike.%${clean}%,email.ilike.%${clean}%,mobile.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(8)

      setSearchRows((data || []) as EnquirySearchRow[])
      setSearching(false)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [search, supabase])

  const pageTitle = formatSectionTitle(pathname)

  const breadcrumb = React.useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    const labels = parts.map((part) =>
      part
        .split('-')
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(' ')
    )
    return labels.join(' / ')
  }, [pathname])

  const markNotificationsAsRead = () => {
    writeAdminLastSeenAt(new Date().toISOString())
    setUnreadNotifications(0)
    setNotificationsOpen(false)
    toast.success('Notifications marked as read')
  }

  const toggleNotificationsPanel = () => {
    const opening = !notificationsOpen

    if (opening && notificationPrefs.markAsReadOnBellOpen && unreadNotifications > 0) {
      writeAdminLastSeenAt(new Date().toISOString())
      setUnreadNotifications(0)
    }

    setNotificationsOpen(opening)
  }

  const clearCookies = () => {
    if (typeof document === 'undefined') return
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim()
      document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`
    })
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)

    await supabase.auth.signOut()
    clearCookies()
    toast.success('Signed out successfully')
    router.replace('/admin/login')
    router.refresh()
  }

  const renderSidebar = (mobile = false) => {
    const sidebarClasses = mobile
      ? 'h-full w-[260px] border-r border-[#1f2937] bg-gradient-to-b from-[#020617] via-[#0b1220] to-[#111827] p-4 text-[#e2e8f0]'
      : 'fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-[#1f2937] bg-gradient-to-b from-[#020617] via-[#0b1220] to-[#111827] p-4 text-[#e2e8f0] md:flex md:flex-col'

    return (
      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0f172a]/90 px-3 py-3">
          <div>
            <Image
              src="/brand/logo-kampus-filter.webp"
              alt="Kampus Filter"
              width={150}
              height={34}
              className="h-8 w-auto"
            />
            <p className="text-xs text-[#cbd5e1]">Admin Panel</p>
          </div>
          <span className="rounded-full bg-[#fca311] px-2 py-0.5 text-[10px] font-bold text-white">Admin</span>
        </div>

        <div className="my-4 border-t border-[#1e293b]" />

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (mobile) setMobileOpen(false)
                }}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#1d4ed8] text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)]'
                    : 'text-[#cbd5e1] hover:bg-[#0f172a] hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.href === '/admin/leads' ? 'bg-red-100 text-red-700' : 'bg-[#e0e7ff] text-[#1e3a8a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-[#334155] bg-[#0f172a]/90 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white">
              {(profile?.name || profile?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile?.name || 'Admin User'}</p>
              <p className="truncate text-xs text-[#cbd5e1]">{profile?.email || 'admin@kampusfilter.com'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full bg-[#1e293b] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e2e8f0]">
              {profile?.role || 'Admin'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 rounded-md border border-[#334155] px-2 py-1 text-xs font-medium text-[#e2e8f0] hover:bg-[#1e293b]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f7ff] dark:bg-neutral-900">
      {renderSidebar(false)}

      <header className="fixed top-0 left-0 right-0 z-30 h-16 border-b border-[#dbe3f1] bg-white/90 backdrop-blur md:left-[260px] dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex h-full items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#333333] md:hidden dark:border-neutral-700 dark:text-neutral-200"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-[220px] md:block">
            <p className="text-base font-semibold text-[#000000] dark:text-white">{pageTitle}</p>
            <p className="text-xs text-[#666666] dark:text-neutral-400">{breadcrumb}</p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              <Search className="h-4 w-4 text-[#666666]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search leads by name, email, mobile..."
                className="w-full bg-transparent text-sm text-[#333333] outline-none placeholder:text-[#666666] dark:text-neutral-200"
              />
            </div>

            {searchOpen && (searching || searchRows.length > 0 || search.trim()) && (
              <div className="absolute z-40 mt-2 w-full rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {searching ? (
                  <p className="px-2 py-2 text-xs text-[#666666]">Searching...</p>
                ) : searchRows.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[#666666]">No matching leads found.</p>
                ) : (
                  <div className="space-y-1">
                    {searchRows.map((row) => (
                      <Link
                        key={row.id}
                        href={`/admin/leads?lead=${row.id}`}
                        onClick={() => {
                          setSearchOpen(false)
                          setSearch('')
                        }}
                        className="w-full rounded-md px-2 py-2 text-left hover:bg-[#fafafa] dark:hover:bg-neutral-800"
                      >
                        <p className="text-sm font-medium text-[#000000] dark:text-white">{row.name || row.email || 'Unnamed lead'}</p>
                        <p className="text-xs text-[#666666]">{row.email || '-'} {row.mobile ? `| ${row.mobile}` : ''}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#333333] hover:bg-[#fafafa] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleNotificationsPanel}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#333333] hover:bg-[#fafafa] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border border-[#e5e7eb] bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm font-semibold text-[#000000] dark:text-white">Notifications</p>
                <p className="mt-1 text-xs text-[#666666]">
                  {!notificationPrefs.enableInApp
                    ? 'In-app notifications are disabled in Settings.'
                    : unreadNotifications > 0
                      ? `${unreadNotifications} new enquiry${unreadNotifications === 1 ? '' : 'ies'} pending.`
                      : 'No unread enquiries right now.'}
                </p>

                <div className="mt-2 rounded-md border border-[#eef2f7] bg-[#f8fbff] px-2 py-1.5">
                  <p className="text-[11px] font-medium text-[#334155]">
                    Browser alerts: {notificationPermission === 'granted' ? 'Allowed' : notificationPermission === 'denied' ? 'Blocked' : 'Not enabled'}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={markNotificationsAsRead}
                    className="rounded-md border border-[#dbe3f1] bg-white px-2.5 py-1 text-xs font-medium text-[#14213d] hover:bg-[#f8fbff]"
                  >
                    Mark Read
                  </button>
                  <Link
                    href="/admin/settings"
                    className="rounded-md border border-[#dbe3f1] bg-white px-2.5 py-1 text-xs font-medium text-[#14213d] hover:bg-[#f8fbff]"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Notification Settings
                  </Link>
                  <Link
                    href="/admin/leads"
                    className="rounded-md bg-[#14213d] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#29447e]"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    View Leads
                  </Link>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!mounted) return
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#333333] hover:bg-[#fafafa] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Toggle theme"
            >
              {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14213d] text-xs font-bold text-white">
                  {(profile?.name || profile?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="h-4 w-4 text-[#666666]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-lg border border-[#e5e7eb] bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  <Link href="/admin/settings" className="block rounded-md px-3 py-2 text-sm text-[#333333] hover:bg-[#fafafa] dark:text-neutral-200 dark:hover:bg-neutral-800">
                    View Profile
                  </Link>
                  <Link href="/admin/settings" className="block rounded-md px-3 py-2 text-sm text-[#333333] hover:bg-[#fafafa] dark:text-neutral-200 dark:hover:bg-neutral-800">
                    Change Password
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#333333] hover:bg-[#fafafa] disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {signingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16 md:ml-[260px]">
        <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#eef4ff] via-[#f8fbff] to-[#ffffff] p-6 dark:bg-neutral-900">{children}</div>
      </main>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 md:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <div className="relative h-full">
                {renderSidebar(true)}
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#333333]"
                  aria-label="Close mobile sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
