export type SavedPageEntry = {
  slug: string
  savedAt: number
}

const SAVED_KEY = 'saved_pages'
const COMPARE_KEY = 'compare_pages'
const RECENT_KEY = 'recently_viewed'

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function notifyStorageChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kf:storage'))
  }
}

export function getSavedPages(): SavedPageEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Backward compatibility: old format was string[]
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      return parsed.map((slug: string) => ({ slug, savedAt: Date.now() }))
    }

    return parsed
      .filter((x: any) => x && typeof x.slug === 'string')
      .map((x: any) => ({ slug: x.slug, savedAt: Number(x.savedAt) || Date.now() }))
  } catch {
    return []
  }
}

export function setSavedPages(entries: SavedPageEntry[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
  notifyStorageChange()
}

export function isSavedPage(slug: string) {
  return getSavedPages().some((s) => s.slug === slug)
}

export function toggleSavedPage(slug: string) {
  const current = getSavedPages()
  const exists = current.some((s) => s.slug === slug)
  if (exists) {
    setSavedPages(current.filter((s) => s.slug !== slug))
    return false
  }
  setSavedPages([{ slug, savedAt: Date.now() }, ...current.filter((s) => s.slug !== slug)])
  return true
}

export function removeSavedPage(slug: string) {
  const current = getSavedPages()
  setSavedPages(current.filter((s) => s.slug !== slug))
}

export function getComparePages(): string[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x: any) => typeof x === 'string').slice(0, 3)
  } catch {
    return []
  }
}

export function setComparePages(slugs: string[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(slugs.slice(0, 3)))
  notifyStorageChange()
}

export function toggleComparePage(slug: string): { ok: boolean; selected: boolean; message?: string } {
  const current = getComparePages()
  const exists = current.includes(slug)

  if (exists) {
    setComparePages(current.filter((s) => s !== slug))
    return { ok: true, selected: false }
  }

  if (current.length >= 3) {
    return { ok: false, selected: false, message: 'You can compare up to 3 pages only.' }
  }

  setComparePages([...current, slug])
  return { ok: true, selected: true }
}

export function removeComparePage(slug: string) {
  const current = getComparePages()
  setComparePages(current.filter((s) => s !== slug))
}

export function clearComparePages() {
  setComparePages([])
}

export function getRecentlyViewed(): string[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x: any) => typeof x === 'string').slice(0, 5)
  } catch {
    return []
  }
}

export function addRecentlyViewed(slug: string) {
  if (!slug) return
  const current = getRecentlyViewed().filter((s) => s !== slug)
  const next = [slug, ...current].slice(0, 5)
  if (canUseStorage()) {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    notifyStorageChange()
  }
}
