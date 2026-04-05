export const ADMIN_NOTIFICATION_PREFS_KEY = 'kf_admin_notification_prefs'
export const ADMIN_NOTIFICATION_LAST_SEEN_KEY = 'kf_admin_last_seen_at'

export type AdminNotificationPreferences = {
  enableInApp: boolean
  enableToast: boolean
  enableBrowserPush: boolean
  enableSound: boolean
  markAsReadOnBellOpen: boolean
}

export const DEFAULT_ADMIN_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  enableInApp: true,
  enableToast: true,
  enableBrowserPush: false,
  enableSound: false,
  markAsReadOnBellOpen: false,
}

function pickBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function sanitizeAdminNotificationPreferences(input: unknown): AdminNotificationPreferences {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES }
  }

  const raw = input as Record<string, unknown>

  return {
    enableInApp: pickBoolean(raw.enableInApp, DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.enableInApp),
    enableToast: pickBoolean(raw.enableToast, DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.enableToast),
    enableBrowserPush: pickBoolean(raw.enableBrowserPush, DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.enableBrowserPush),
    enableSound: pickBoolean(raw.enableSound, DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.enableSound),
    markAsReadOnBellOpen: pickBoolean(
      raw.markAsReadOnBellOpen,
      DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.markAsReadOnBellOpen
    ),
  }
}

export function readAdminNotificationPrefs(): AdminNotificationPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES }
  }

  const raw = window.localStorage.getItem(ADMIN_NOTIFICATION_PREFS_KEY)
  if (!raw) {
    return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES }
  }

  try {
    const parsed = JSON.parse(raw)
    return sanitizeAdminNotificationPreferences(parsed)
  } catch {
    return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES }
  }
}

export function writeAdminNotificationPrefs(value: AdminNotificationPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_NOTIFICATION_PREFS_KEY, JSON.stringify(value))
}

export function readAdminLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ADMIN_NOTIFICATION_LAST_SEEN_KEY)
}

export function writeAdminLastSeenAt(value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_NOTIFICATION_LAST_SEEN_KEY, value)
}
