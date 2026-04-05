import { NextRequest, NextResponse } from 'next/server'
import { buildActivityEntry, leadBulkSchema } from '../../../../../lib/leads/shared'
import { requireAdminRoute } from '../../../../../lib/leads/server'
import { ensureSameOrigin } from '../../../../../lib/security/request'

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

    const parsed = leadBulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
    }

    const { ids, action, status } = parsed.data

    if (action === 'delete') {
      const { error } = await authResult.context.supabase.from('enquiries').delete().in('id', ids)

      if (error) {
        console.error('[POST /api/admin/leads/bulk] delete failed', error)
        return NextResponse.json({ error: 'Unable to delete selected leads' }, { status: 500 })
      }

      return NextResponse.json({ success: true, affected: ids.length })
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required for update_status action' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const adminName = authResult.context.admin.name || authResult.context.admin.email || 'Admin'

    const { data: currentRows, error: fetchError } = await authResult.context.supabase
      .from('enquiries')
      .select('id, status, activity_log')
      .in('id', ids)

    if (fetchError) {
      console.error('[POST /api/admin/leads/bulk] fetch failed', fetchError)
      return NextResponse.json({ error: 'Unable to process selected leads' }, { status: 500 })
    }

    const changedIds: string[] = []

    for (const row of currentRows || []) {
      const currentStatus = String((row as any).status || 'new')
      if (currentStatus === status) continue

      const activity = Array.isArray((row as any).activity_log) ? ([...(row as any).activity_log] as any[]) : []
      activity.push(
        buildActivityEntry({
          type: 'status_changed',
          description: `Status changed from ${currentStatus} to ${status}`,
          from_status: currentStatus as any,
          to_status: status,
          admin_name: adminName,
        })
      )

      const { error: updateError } = await authResult.context.supabase
        .from('enquiries')
        .update({
          status,
          activity_log: activity,
          updated_at: now,
        })
        .eq('id', (row as any).id)

      if (!updateError) {
        changedIds.push(String((row as any).id))
      }
    }

    if (changedIds.length === 0) {
      return NextResponse.json({ success: true, affected: 0 })
    }

    return NextResponse.json({ success: true, affected: changedIds.length })
  } catch (error) {
    console.error('[POST /api/admin/leads/bulk] unexpected error', error)
    return NextResponse.json({ error: 'Unable to process bulk action' }, { status: 500 })
  }
}
