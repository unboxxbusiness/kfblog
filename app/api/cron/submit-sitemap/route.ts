import { NextRequest, NextResponse } from 'next/server'
import { logCronEvent } from '../../../../lib/cron-logger'

const DEFAULT_BASE_URL = 'https://kampusfilter.com'

function normalize(value: string | null | undefined): string {
  return String(value || '').trim()
}

function getBaseUrl(): string {
  const envUrl = normalize(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL)
  return (envUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function hasPermission(request: NextRequest): boolean {
  const expected = normalize(process.env.CRON_SECRET)
  if (!expected) return true

  const provided = normalize(request.headers.get('x-cron-secret'))
  return Boolean(provided) && provided === expected
}

async function ping(url: string) {
  try {
    const response = await fetch(url, { method: 'GET' })
    return { ok: response.ok, status: response.status }
  } catch {
    return { ok: false, status: 0 }
  }
}

export async function GET(request: NextRequest) {
  if (!hasPermission(request)) return unauthorized()

  const sitemapUrl = `${getBaseUrl()}/sitemap.xml`

  const [google, bing] = await Promise.all([
    ping(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    ping(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
  ])

  const ok = google.ok || bing.ok

  await logCronEvent({
    job: 'submit-sitemap',
    status: ok ? 'success' : 'error',
    message: ok ? 'Sitemap ping completed' : 'Sitemap ping failed',
    details: {
      sitemap: sitemapUrl,
      google_status: google.status,
      bing_status: bing.status,
    },
  })

  return NextResponse.json({
    ok,
    sitemap: sitemapUrl,
    google,
    bing,
  })
}
