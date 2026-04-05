import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildCollegeUrlsFromSlugs, submitIndexNow } from '../../../lib/indexnow'
import { logCronEvent } from '../../../lib/cron-logger'

const bodySchema = z.object({
  slugs: z.array(z.string().trim().min(1)).min(1).max(500),
})

function normalizeSecret(value: string | null): string {
  return String(value || '').trim()
}

function hasPermission(request: NextRequest): boolean {
  const configured = normalizeSecret(process.env.CRON_SECRET || null)
  if (!configured) return true

  const fromHeader = normalizeSecret(request.headers.get('x-cron-secret'))
  return Boolean(fromHeader) && fromHeader === configured
}

async function submitGoogleIndexing(urls: string[]) {
  const endpoint = String(process.env.GOOGLE_INDEXING_ENDPOINT || '').trim()
  const token = String(process.env.GOOGLE_INDEXING_TOKEN || '').trim()

  if (!endpoint || !token || urls.length === 0) {
    return { attempted: false, accepted: 0 }
  }

  let accepted = 0
  for (const url of urls.slice(0, 100)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        type: 'URL_UPDATED',
      }),
    })

    if (response.ok) accepted += 1
  }

  return {
    attempted: true,
    accepted,
  }
}

export async function POST(request: NextRequest) {
  if (!hasPermission(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
  }

  const urls = buildCollegeUrlsFromSlugs(parsed.data.slugs)
  if (urls.length === 0) {
    return NextResponse.json({ error: 'No valid slugs provided' }, { status: 400 })
  }

  const indexNowResponse = await submitIndexNow(urls)
  const googleResponse = await submitGoogleIndexing(urls)

  await logCronEvent({
    job: 'indexnow-manual-submit',
    status: indexNowResponse.ok ? 'success' : 'error',
    message: indexNowResponse.ok ? 'IndexNow submitted successfully' : 'IndexNow submission failed',
    details: {
      submitted_urls: urls.length,
      indexnow_status: indexNowResponse.status,
      google_attempted: googleResponse.attempted,
      google_accepted: googleResponse.accepted,
    },
  })

  return NextResponse.json({
    ok: indexNowResponse.ok,
    submitted: urls.length,
    indexnow: {
      status: indexNowResponse.status,
      body: indexNowResponse.body,
    },
    google: googleResponse,
  })
}
