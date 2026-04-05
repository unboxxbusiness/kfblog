const BROKEN_INTERNAL_CTA_PATHS = new Set(['/counselling', '/counseling'])

function normalizePathname(value: string): string {
  const [pathname] = value.split(/[?#]/)
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed || '/'
}

export function normalizeCtaHref(rawHref: unknown, fallbackHref = '/apply'): string {
  const fallback = String(fallbackHref || '/apply').trim() || '/apply'
  const href = String(rawHref || '').trim()

  if (!href || href === '#') return fallback
  if (/^javascript:/i.test(href)) return fallback

  if (href.startsWith('/')) {
    const normalizedPath = normalizePathname(href).toLowerCase()
    if (BROKEN_INTERNAL_CTA_PATHS.has(normalizedPath)) {
      return fallback
    }
    return href
  }

  try {
    const parsed = new URL(href)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
      return href
    }
  } catch {
    return fallback
  }

  return fallback
}

export function isInternalHref(href: string): boolean {
  return href.startsWith('/')
}