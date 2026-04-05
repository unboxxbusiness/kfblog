import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/admin-auth'
import { logCronEvent } from '../../../../lib/cron-logger'
import { requireAdminRoute } from '../../../../lib/leads/server'

function normalize(value: string | null | undefined): string {
  return String(value || '').trim()
}

function hasCronSecret(request: NextRequest): boolean {
  const expected = normalize(process.env.CRON_SECRET)
  if (!expected) return false

  const provided = normalize(request.headers.get('x-cron-secret'))
  return Boolean(provided) && provided === expected
}

async function hasAdminSession(request: NextRequest): Promise<boolean> {
  const authResult = await requireAdminRoute()
  return authResult.ok
}

async function fetchPublishedSlugs(limit = 200): Promise<string[]> {
  const adminClientResult = createAdminClient()
  if (!adminClientResult.data) return []

  const { data, error } = await adminClientResult.data
    .from('pages')
    .select('slug')
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) return []

  return (data || [])
    .map((row: any) => String(row.slug || '').trim())
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  const allowed = hasCronSecret(request) || (await hasAdminSession(request))

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slugs = await fetchPublishedSlugs(200)

  revalidatePath('/')
  revalidatePath('/search')
  revalidatePath('/courses')
  revalidatePath('/cities')
  revalidatePath('/sitemap.xml')

  slugs.forEach((slug) => {
    revalidatePath(`/colleges/${slug}`)
  })

  await logCronEvent({
    job: 'revalidate',
    status: 'success',
    message: 'ISR cache revalidation completed',
    details: {
      revalidated_slugs: slugs.length,
    },
  })

  return NextResponse.json({
    ok: true,
    revalidated_slugs: slugs.length,
  })
}
