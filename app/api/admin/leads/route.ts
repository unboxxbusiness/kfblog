import { NextRequest, NextResponse } from 'next/server'
import {
  buildActivityEntry,
  buildStatusCounts,
  leadCreateSchema,
  parseLeadQuery,
  uniqueValues,
} from '../../../../lib/leads/shared'
import {
  fetchAllLeadRows,
  filterAndSortLeads,
  requireAdminRoute,
  resilientInsertLead,
} from '../../../../lib/leads/server'
import { ensureSameOrigin } from '../../../../lib/security/request'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminRoute()
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status })
    }

    const query = parseLeadQuery(request.nextUrl.searchParams)
    const rowsResult = await fetchAllLeadRows(authResult.context.supabase)

    if (rowsResult.error) {
      console.error('[GET /api/admin/leads] fetch rows failed', rowsResult.error)
      return NextResponse.json({ error: 'Unable to load leads' }, { status: 500 })
    }

    const rowsForCounts = filterAndSortLeads(rowsResult.data, { ...query, status: 'all' }, { skipStatusFilter: true })
    const status_counts = buildStatusCounts(rowsForCounts)

    const rows = filterAndSortLeads(rowsResult.data, query)

    const total = rows.length
    const pages = Math.max(1, Math.ceil(total / query.limit))
    const current_page = Math.min(Math.max(1, query.page), pages)
    const start = (current_page - 1) * query.limit
    const pagedRows = rows.slice(start, start + query.limit)

    return NextResponse.json({
      data: pagedRows,
      count: total,
      pages,
      current_page,
      status_counts,
      filter_options: {
        courses: uniqueValues(rowsForCounts, 'course_interest'),
        cities: uniqueValues(rowsForCounts, 'city_interest'),
        exams: uniqueValues(rowsForCounts, 'exam_type'),
        budgets: uniqueValues(rowsForCounts, 'budget'),
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/leads] unexpected error', error)
    return NextResponse.json({ error: 'Unable to load leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminRoute()
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status })
    }

    const originCheck = ensureSameOrigin(request)
    if (!originCheck.ok) {
      return NextResponse.json({ error: originCheck.message }, { status: originCheck.status })
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = leadCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const status = parsed.data.status || 'new'

    const insertPayload: Record<string, any> = {
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      mobile: parsed.data.mobile ?? null,
      course_interest: parsed.data.course_interest ?? null,
      city_interest: parsed.data.city_interest ?? null,
      budget: parsed.data.budget ?? null,
      exam_type: parsed.data.exam_type ?? null,
      class12_stream: parsed.data.class12_stream ?? null,
      class12_percentage: parsed.data.class12_percentage ?? null,
      message: parsed.data.message ?? null,
      status,
      source_page_slug: parsed.data.source_page_slug ?? null,
      source_page_title: parsed.data.source_page_title ?? null,
      utm_source: parsed.data.utm_source ?? null,
      utm_medium: parsed.data.utm_medium ?? null,
      utm_campaign: parsed.data.utm_campaign ?? null,
      admin_notes: parsed.data.admin_notes ?? null,
      contact_channel: parsed.data.contact_channel ?? null,
      notes_json: [],
      activity_log: [
        buildActivityEntry({
          type: 'created',
          description: 'Lead created manually by admin',
          to_status: status,
          admin_name: authResult.context.admin.name || authResult.context.admin.email || 'Admin',
        }),
      ],
      created_at: now,
      updated_at: now,
    }

    const insertResult = await resilientInsertLead(authResult.context.supabase, insertPayload)
    if (insertResult.error || !insertResult.data) {
      console.error('[POST /api/admin/leads] insert failed', insertResult.error)
      return NextResponse.json({ error: 'Unable to create lead' }, { status: 500 })
    }

    return NextResponse.json({ data: insertResult.data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/leads] unexpected error', error)
    return NextResponse.json({ error: 'Unable to create lead' }, { status: 500 })
  }
}
