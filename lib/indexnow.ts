const DEFAULT_BASE_URL = 'https://kampusfilter.com'
export const FALLBACK_INDEXNOW_KEY = 'indexnow-key-unconfigured'

function normalizeBaseUrl(): string {
  return String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '')
}

export function getIndexNowKey(): string {
  const envKey = String(process.env.INDEXNOW_KEY || '').trim()
  return envKey || FALLBACK_INDEXNOW_KEY
}

export function buildCollegeUrlsFromSlugs(slugs: string[]): string[] {
  const baseUrl = normalizeBaseUrl()

  return Array.from(new Set(slugs))
    .map((slug) => String(slug || '').trim().toLowerCase())
    .filter(Boolean)
    .map((slug) => `${baseUrl}/colleges/${encodeURIComponent(slug)}`)
}

export function getIndexNowKeyLocation(): string {
  return `${normalizeBaseUrl()}/${getIndexNowKey()}.txt`
}

export async function submitIndexNow(urlList: string[]) {
  const host = new URL(normalizeBaseUrl()).hostname
  const key = getIndexNowKey()

  const payload = {
    host,
    key,
    keyLocation: getIndexNowKeyLocation(),
    urlList,
  }

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const raw = await response.text().catch(() => '')

  return {
    ok: response.ok,
    status: response.status,
    body: raw,
    payload,
  }
}
