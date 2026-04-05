'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Bell, KeyRound, ShieldCheck, UserCircle2, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_ADMIN_NOTIFICATION_PREFERENCES,
  type AdminNotificationPreferences,
  readAdminLastSeenAt,
  readAdminNotificationPrefs,
  writeAdminLastSeenAt,
  writeAdminNotificationPrefs,
} from '../../../lib/admin-notifications'

type AdminUserRow = {
  name: string | null
  role: string | null
  created_at: string | null
  updated_at: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getPasswordStrength(value: string) {
  const checks = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ]

  const score = checks.filter(Boolean).length
  if (score <= 2) return { score, label: 'Weak', color: 'bg-[#ef4444]' }
  if (score <= 4) return { score, label: 'Medium', color: 'bg-[#f59e0b]' }
  return { score, label: 'Strong', color: 'bg-[#22c55e]' }
}

function playNotificationTone() {
  if (typeof window === 'undefined') return
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.value = 780
    gain.gain.value = 0.045

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.2)

    window.setTimeout(() => {
      void context.close()
    }, 260)
  } catch {
    // Ignore browser audio policy failures.
  }
}

function currentPermission(): NotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${disabled ? 'opacity-60' : ''}`}>
      <div>
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
        <p className="mt-1 text-xs text-[#64748b]">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#14213d]"
      />
    </label>
  )
}

export default function AdminSettingsPage() {
  const supabase = React.useMemo(() => createClientComponentClient(), [])
  const [loading, setLoading] = React.useState(true)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [savingNotifications, setSavingNotifications] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState('admin')
  const [createdAt, setCreatedAt] = React.useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [notificationPrefs, setNotificationPrefs] = React.useState<AdminNotificationPreferences>(
    DEFAULT_ADMIN_NOTIFICATION_PREFERENCES
  )
  const [lastSeenAt, setLastSeenAt] = React.useState<string | null>(null)
  const [permission, setPermission] = React.useState<NotificationPermission>('default')

  const passwordStrength = React.useMemo(() => getPasswordStrength(password), [password])

  React.useEffect(() => {
    const run = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      setEmail(user?.email || '')
      setPermission(currentPermission())

      const metadataName =
        typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : ''

      if (metadataName) {
        setName(metadataName)
      }

      if (user?.id) {
        const { data } = await supabase
          .from('admin_users')
          .select('name, role, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle()

        const row = (data || null) as AdminUserRow | null
        if (row?.name) setName(String(row.name))
        if (row?.role) setRole(String(row.role))
        setCreatedAt(row?.created_at || null)
        setUpdatedAt(row?.updated_at || null)
      }

      setNotificationPrefs(readAdminNotificationPrefs())
      setLastSeenAt(readAdminLastSeenAt())

      setLoading(false)
    }
    void run()
  }, [supabase])

  const updateNotificationPref = <K extends keyof AdminNotificationPreferences>(key: K, value: AdminNotificationPreferences[K]) => {
    setNotificationPrefs((current) => ({ ...current, [key]: value }))
  }

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextName = name.trim()
    if (!nextName) {
      toast.error('Name cannot be empty.')
      return
    }

    setSavingProfile(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: nextName },
    })
    setSavingProfile(false)

    if (error) {
      toast.error('Could not update profile name. Please try again.')
      return
    }

    setName(nextName)
    toast.success('Profile updated successfully.')
  }

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Password and confirmation do not match.')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)

    if (error) {
      toast.error('Could not update password. Please try again.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    toast.success('Password updated successfully.')
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)

    writeAdminNotificationPrefs(notificationPrefs)

    if (notificationPrefs.enableInApp && !readAdminLastSeenAt()) {
      writeAdminLastSeenAt(new Date().toISOString())
    }

    setLastSeenAt(readAdminLastSeenAt())
    setPermission(currentPermission())
    setSavingNotifications(false)
    toast.success('Notification preferences saved.')
  }

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      toast.error('Browser push notifications are not supported here.')
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      setNotificationPrefs((current) => ({ ...current, enableBrowserPush: true }))
      toast.success('Browser notification permission granted.')
      return
    }

    if (result === 'denied') {
      setNotificationPrefs((current) => ({ ...current, enableBrowserPush: false }))
      toast.error('Browser notifications are blocked. Allow them from browser settings.')
      return
    }

    toast.message('Browser notification prompt dismissed.')
  }

  const handleTestNotification = () => {
    let fired = false

    if (notificationPrefs.enableToast) {
      toast.success('Test alert: Notifications are working.', {
        description: 'This in-app toast confirms your admin notifications are active.',
      })
      fired = true
    }

    if (notificationPrefs.enableBrowserPush && permission === 'granted' && typeof Notification !== 'undefined') {
      new Notification('Kampus Filter Admin', {
        body: 'Test browser notification delivered successfully.',
      })
      fired = true
    }

    if (notificationPrefs.enableSound) {
      playNotificationTone()
      fired = true
    }

    if (!fired) {
      toast.message('Enable at least one notification channel first.')
    }
  }

  return (
    <main className="space-y-4">
      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#000000]">Settings</h1>
        <p className="mt-2 text-sm text-[#666666]">Manage profile, security, and notification behavior from a single place.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-[#14213d]" />
            <h2 className="text-lg font-semibold text-[#000000]">Account Overview</h2>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-[#f3f4f6]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#f3f4f6]" />
              <div className="h-4 w-56 animate-pulse rounded bg-[#f3f4f6]" />
            </div>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <dt className="text-[#64748b]">Admin Name</dt>
                <dd className="font-medium text-[#111827]">{name || 'Admin User'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <dt className="text-[#64748b]">Email</dt>
                <dd className="font-medium text-[#111827]">{email || '-'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <dt className="text-[#64748b]">Role</dt>
                <dd className="font-medium uppercase text-[#111827]">{role || 'admin'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <dt className="text-[#64748b]">Joined</dt>
                <dd className="font-medium text-[#111827]">{formatDateTime(createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <dt className="text-[#64748b]">Last Updated</dt>
                <dd className="font-medium text-[#111827]">{formatDateTime(updatedAt)}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#14213d]" />
            <h2 className="text-lg font-semibold text-[#000000]">Profile Settings</h2>
          </div>

          <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-[#666666]">Display Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="mt-1 h-11 w-full rounded-md border border-[#e5e5e5] px-3 text-sm outline-none focus:border-[#14213d] focus:ring-2 focus:ring-[#dbeafe]"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-[#666666]">Email</label>
              <input
                value={email}
                readOnly
                className="mt-1 h-11 w-full rounded-md border border-[#e5e5e5] bg-[#f8fafc] px-3 text-sm text-[#334155]"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-[#14213d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#29447e] disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </article>
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#14213d]" />
          <h2 className="text-lg font-semibold text-[#000000]">Notification Preferences</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ToggleRow
            title="Enable In-App Notification Center"
            description="Shows unread notification count in the admin bell and keeps notification history state."
            checked={notificationPrefs.enableInApp}
            onChange={(checked) => updateNotificationPref('enableInApp', checked)}
          />

          <ToggleRow
            title="Toast Alerts"
            description="Show immediate on-screen alerts when new enquiries arrive."
            checked={notificationPrefs.enableToast}
            onChange={(checked) => updateNotificationPref('enableToast', checked)}
          />

          <ToggleRow
            title="Browser Push Notifications"
            description="Show system-level browser notifications for new leads."
            checked={notificationPrefs.enableBrowserPush}
            onChange={(checked) => updateNotificationPref('enableBrowserPush', checked)}
            disabled={permission === 'denied'}
          />

          <ToggleRow
            title="Sound Alerts"
            description="Play a short sound when a new enquiry is received."
            checked={notificationPrefs.enableSound}
            onChange={(checked) => updateNotificationPref('enableSound', checked)}
          />

          <ToggleRow
            title="Auto Mark as Read on Bell Open"
            description="Automatically reset unread count when opening the bell panel."
            checked={notificationPrefs.markAsReadOnBellOpen}
            onChange={(checked) => updateNotificationPref('markAsReadOnBellOpen', checked)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="rounded-md bg-[#14213d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#29447e] disabled:opacity-60"
          >
            {savingNotifications ? 'Saving...' : 'Save Notification Preferences'}
          </button>

          <button
            type="button"
            onClick={handleRequestBrowserPermission}
            className="rounded-md border border-[#dbe3f1] bg-white px-4 py-2 text-sm font-semibold text-[#14213d] hover:bg-[#f8fbff]"
          >
            Request Browser Permission
          </button>

          <button
            type="button"
            onClick={handleTestNotification}
            className="inline-flex items-center gap-1 rounded-md border border-[#dbe3f1] bg-white px-4 py-2 text-sm font-semibold text-[#14213d] hover:bg-[#f8fbff]"
          >
            <Volume2 className="h-4 w-4" />
            Send Test Notification
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-[#e5e5e5] bg-[#fafcff] px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Browser Permission</p>
            <p className="mt-1 font-semibold text-[#0f172a]">
              {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Blocked' : 'Not Requested'}
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e5e5] bg-[#fafcff] px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Last Notification Read</p>
            <p className="mt-1 font-semibold text-[#0f172a]">{formatDateTime(lastSeenAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#14213d]" />
          <h2 className="text-lg font-semibold text-[#000000]">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="h-11 w-full rounded-md border border-[#e5e5e5] px-3 text-sm outline-none focus:border-[#14213d] focus:ring-2 focus:ring-[#dbeafe]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="h-11 w-full rounded-md border border-[#e5e5e5] px-3 text-sm outline-none focus:border-[#14213d] focus:ring-2 focus:ring-[#dbeafe]"
          />

          <div className="rounded-lg border border-[#e5e5e5] bg-[#fafcff] p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wide text-[#64748b]">Password Strength</span>
              <span className="font-semibold text-[#334155]">{passwordStrength.label}</span>
            </div>
            <div className="h-2 rounded-full bg-[#e2e8f0]">
              <div
                className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                style={{ width: `${Math.max(10, (passwordStrength.score / 5) * 100)}%` }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-[#14213d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#29447e] disabled:opacity-60"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </main>
  )
}
