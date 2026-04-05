import { NextRequest, NextResponse } from 'next/server'
import {
  buildActivityEntry,
  buildNoteEntry,
  leadUpdateSchema,
  normalizeEnquiry,
  normalizeStatus,
} from '../../../../../lib/leads/shared'
import { requireAdminRoute, resilientUpdateLead } from '../../../../../lib/leads/server'
import { ensureSameOrigin } from '../../../../../lib/security/request'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteParams) {
  const authResult = await requireAdminRoute()
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status })
  }

  const { id } = await context.params
  const leadId = String(id || '').trim()

  if (!leadId) {
    return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })
  }

  const { data, error } = await authResult.context.supabase
    .from('enquiries')
    .select('*')
    .eq('id', leadId)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/admin/leads/[id]] load failed', error)
    return NextResponse.json({ error: 'Unable to load lead' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ data: normalizeEnquiry(data as Record<string, any>) })
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  const authResult = await requireAdminRoute()
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status })
  }

  const originCheck = ensureSameOrigin(request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.message }, { status: originCheck.status })
  }

  const { id } = await context.params
  const leadId = String(id || '').trim()

  if (!leadId) {
    return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = leadUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
  }

  const { data: currentData, error: currentError } = await authResult.context.supabase
    .from('enquiries')
    .select('*')
    .eq('id', leadId)
    .maybeSingle()

  if (currentError) {
    console.error('[PATCH /api/admin/leads/[id]] fetch current failed', currentError)
    return NextResponse.json({ error: 'Unable to update lead' }, { status: 500 })
  }

  if (!currentData) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const currentLead = normalizeEnquiry(currentData as Record<string, any>)

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  const assignableKeys: Array<keyof typeof parsed.data> = [
    'name',
    'email',
    'mobile',
    'course_interest',
    'city_interest',
    'budget',
    'exam_type',
    'class12_stream',
    'class12_percentage',
    'message',
    'source_page_slug',
    'source_page_title',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'admin_notes',
    'contact_channel',
  ]

  assignableKeys.forEach((key) => {
    if (key in parsed.data) {
      updatePayload[key] = parsed.data[key] ?? null
    }
  })

  const nextActivity = [...(currentLead.activity_log || [])]

  if (parsed.data.status) {
    const nextStatus = normalizeStatus(parsed.data.status)
    updatePayload.status = nextStatus

    if (currentLead.status !== nextStatus) {
      nextActivity.push(
        buildActivityEntry({
          type: 'status_changed',
          description: `Status changed from ${currentLead.status} to ${nextStatus}`,
          from_status: currentLead.status,
          to_status: nextStatus,
          admin_name: authResult.context.admin.name || authResult.context.admin.email || 'Admin',
        })
      )
    }
  }

  if (parsed.data.new_note) {
    const note = buildNoteEntry(parsed.data.new_note, authResult.context.admin.name || authResult.context.admin.email || 'Admin')
    updatePayload.notes_json = [...(currentLead.notes_json || []), note]
    nextActivity.push(
      buildActivityEntry({
        type: 'note_added',
        description: 'Admin note added',
        admin_name: authResult.context.admin.name || authResult.context.admin.email || 'Admin',
      })
    )
  }

  if (nextActivity.length > 0) {
    updatePayload.activity_log = nextActivity
  }

  if (Object.keys(updatePayload).length === 1) {
    return NextResponse.json({ data: currentLead })
  }

  const updateResult = await resilientUpdateLead(authResult.context.supabase, leadId, updatePayload)

  if (updateResult.error || !updateResult.data) {
    console.error('[PATCH /api/admin/leads/[id]] update failed', updateResult.error)
    return NextResponse.json({ error: 'Unable to update lead' }, { status: 500 })
  }

  return NextResponse.json({ data: updateResult.data })
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const authResult = await requireAdminRoute()
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status })
  }

  const originCheck = ensureSameOrigin(request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.message }, { status: originCheck.status })
  }

  const { id } = await context.params
  const leadId = String(id || '').trim()

  if (!leadId) {
    return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })
  }

  const { error } = await authResult.context.supabase.from('enquiries').delete().eq('id', leadId)

  if (error) {
    console.error('[DELETE /api/admin/leads/[id]] delete failed', error)
    return NextResponse.json({ error: 'Unable to delete lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
