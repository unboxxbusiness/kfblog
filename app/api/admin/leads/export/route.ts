import { NextRequest, NextResponse } from 'next/server'
import { parseLeadQuery } from '../../../../../lib/leads/shared'
import { fetchAllLeadRows, filterAndSortLeads, requireAdminRoute } from '../../../../../lib/leads/server'

export async function GET(request: NextRequest) {
  const authResult = await requireAdminRoute()
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status })
  }

  const query = parseLeadQuery(request.nextUrl.searchParams)
  const rowsResult = await fetchAllLeadRows(authResult.context.supabase)

  if (rowsResult.error) {
    console.error('[GET /api/admin/leads/export] fetch rows failed', rowsResult.error)
    return NextResponse.json({ error: 'Unable to export leads right now' }, { status: 500 })
  }

  const rows = filterAndSortLeads(rowsResult.data, query)

  return NextResponse.json({
    data: rows,
    count: rows.length,
  })
}
