import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '../../../lib/admin-auth'
import { resilientInsertLead } from '../../../lib/leads/server'
import { buildActivityEntry } from '../../../lib/leads/shared'
import { rateLimit } from '../../../lib/security/rate-limit'
import { ensureSameOrigin } from '../../../lib/security/request'

const leadSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address').max(160, 'Email is too long'),
  mobile: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  course: z.string().trim().min(1, 'Course is required').max(120, 'Course is too long'),
  source_page_slug: z.string().trim().max(240).optional(),
  source_page_title: z.string().trim().max(240).optional(),
  college_name: z.string().trim().max(240).optional(),
})

const LEAD_SUBMIT_LIMIT = 10
const LEAD_SUBMIT_WINDOW_MS = 60_000

function toNullableString(value: unknown): string | null {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

function getLeadInsertClient(): { client: ReturnType<typeof createAdminClient>['data']; error: string | null } {
  const adminClientResult = createAdminClient()
  if (!adminClientResult.data) {
    return {
      client: null,
      error: adminClientResult.error || 'Missing Supabase credentials for lead submission',
    }
  }

  return { client: adminClientResult.data, error: null }
}

export async function POST(request: NextRequest) {
  const originCheck = ensureSameOrigin(request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.message }, { status: originCheck.status })
  }

  const rateLimitResult = rateLimit({
    request,
    keyPrefix: 'lead-submit',
    limit: LEAD_SUBMIT_LIMIT,
    windowMs: LEAD_SUBMIT_WINDOW_MS,
  })

  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfterSeconds),
        },
      }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = leadSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
  }

  const { client, error: clientError } = getLeadInsertClient()
  if (!client) {
    return NextResponse.json({ error: clientError || 'Lead storage is not configured' }, { status: 503 })
  }

  const now = new Date().toISOString()
  const sourcePageSlug = toNullableString(parsed.data.source_page_slug)
  const sourcePageTitle = toNullableString(parsed.data.source_page_title)
  const collegeName = toNullableString(parsed.data.college_name)

  const contextBits: string[] = []
  if (collegeName) contextBits.push(`Interested in ${collegeName}`)
  if (sourcePageTitle) contextBits.push(`Source page: ${sourcePageTitle}`)

  const insertPayload: Record<string, any> = {
    name: parsed.data.name,
    email: parsed.data.email,
    mobile: parsed.data.mobile,
    course_interest: parsed.data.course,
    message: contextBits.length > 0 ? contextBits.join(' | ') : null,
    status: 'new',
    source_page_slug: sourcePageSlug,
    source_page_title: sourcePageTitle,
    notes_json: [],
    activity_log: [
      buildActivityEntry({
        type: 'created',
        description: 'Lead submitted via apply form',
        to_status: 'new',
        admin_name: 'Website Form',
      }),
    ],
    created_at: now,
    updated_at: now,
  }

  const insertResult = await resilientInsertLead(client, insertPayload)

  if (insertResult.error || !insertResult.data) {
    console.error('[POST /api/leads] lead insert failed', insertResult.error)
    return NextResponse.json({ error: 'Unable to submit your details right now. Please try again.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: insertResult.data.id,
        created_at: insertResult.data.created_at,
      },
    },
    { status: 201 }
  )
}
