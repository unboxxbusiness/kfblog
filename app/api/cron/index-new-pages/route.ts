import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/admin-auth'
import { buildCollegeUrlsFromSlugs, submitIndexNow } from '../../../../lib/indexnow'
import { logCronEvent } from '../../../../lib/cron-logger'

function normalize(value: string | null | undefined): string {
  return String(value || '').trim()
}

function hasPermission(request: NextRequest): boolean {
  const expected = normalize(process.env.CRON_SECRET)
  if (!expected) return true

  const provided = normalize(request.headers.get('x-cron-secret'))
  return Boolean(provided) && provided === expected
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function minutesAgoIso(minutes: number): string {
  const date = new Date(Date.now() - minutes * 60_000)
  return date.toISOString()
}

async function fetchNewSlugs() {
  const adminClientResult = createAdminClient()
  if (!adminClientResult.data) {
    return { slugs: [] as string[], error: adminClientResult.error || 'Admin client unavailable' }
  }

  const { data, error } = await adminClientResult.data
    .from('pages')
    .select('slug')
    .eq('published', true)
    .gte('created_at', minutesAgoIso(30))
    .order('created_at', { ascending: false })

  if (error) {
    return { slugs: [] as string[], error: error.message }
  }

  const slugs = (data || [])
    .map((row: any) => String(row.slug || '').trim().toLowerCase())
    .filter(Boolean)

  return { slugs: Array.from(new Set(slugs)), error: null }
}

export async function GET(request: NextRequest) {
  if (!hasPermission(request)) return unauthorized()

  const { slugs, error } = await fetchNewSlugs()

  if (error) {
    await logCronEvent({
      job: 'index-new-pages',
      status: 'error',
      message: 'Failed to fetch newly published pages',
      details: { error },
    })

    return NextResponse.json({ ok: false, error }, { status: 500 })
  }

  if (slugs.length === 0) {
    await logCronEvent({
      job: 'index-new-pages',
      status: 'success',
      message: 'No new pages detected in the last 30 minutes',
      details: { submitted: 0 },
    })

    return NextResponse.json({ ok: true, submitted: 0, slugs: [] })
  }

  const urls = buildCollegeUrlsFromSlugs(slugs)
  const response = await submitIndexNow(urls)

  slugs.forEach((slug) => {
    revalidatePath(`/colleges/${slug}`)
  })
  revalidatePath('/sitemap.xml')

  await logCronEvent({
    job: 'index-new-pages',
    status: response.ok ? 'success' : 'error',
    message: response.ok ? 'Submitted newly created pages to IndexNow' : 'IndexNow submission for new pages failed',
    details: {
      slugs,
      submitted: urls.length,
      indexnow_status: response.status,
    },
  })

  return NextResponse.json({
    ok: response.ok,
    submitted: urls.length,
    slugs,
    indexnow_status: response.status,
  })
}
