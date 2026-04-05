import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyLeadFilters,
  type Enquiry,
  type LeadQuery,
  normalizeEnquiry,
  sortLeads,
} from './shared'

export type AdminRouteContext = {
  supabase: SupabaseClient
  admin: {
    id: string
    name: string | null
    email: string | null
    role: string | null
  }
}

export async function requireAdminRoute(): Promise<
  | { ok: true; context: AdminRouteContext }
  | { ok: false; status: number; message: string }
> {
  try {
    const cookieStore = await cookies()
    const getCookieStore = (() => cookieStore) as unknown as () => ReturnType<typeof cookies>
    const supabase = createServerComponentClient({
      cookies: getCookieStore,
    })

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const userId = String(session?.user?.id || '').trim()
    if (sessionError || !userId) {
      return { ok: false, status: 401, message: 'Unauthorized' }
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, email, role')
      .eq('id', userId)
      .maybeSingle()

    if (adminError || !adminRow) {
      return { ok: false, status: 403, message: 'Admin access required' }
    }

    return {
      ok: true,
      context: {
        supabase,
        admin: {
          id: String(adminRow.id),
          name: adminRow.name ? String(adminRow.name) : null,
          email: adminRow.email ? String(adminRow.email) : null,
          role: adminRow.role ? String(adminRow.role) : null,
        },
      },
    }
  } catch (error) {
    return { ok: false, status: 500, message: 'Admin authentication failed' }
  }
}

export async function fetchAllLeadRows(supabase: SupabaseClient): Promise<{ data: Enquiry[]; error: string | null }> {
  const pageSize = 1000
  let from = 0
  let keepGoing = true
  const rows: Enquiry[] = []

  while (keepGoing) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return { data: [], error: error.message }
    }

    const chunk = (data || []).map((row: any) => normalizeEnquiry(row))
    rows.push(...chunk)

    if (!data || data.length < pageSize) {
      keepGoing = false
    } else {
      from += pageSize
    }
  }

  return { data: rows, error: null }
}

function parseMissingColumnFromError(message: string): string | null {
  const patterns = [
    /column "([a-zA-Z0-9_]+)" of relation "enquiries" does not exist/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
    /column ([a-zA-Z0-9_]+) does not exist/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export async function resilientInsertLead(
  supabase: SupabaseClient,
  inputPayload: Record<string, any>
): Promise<{ data: Enquiry | null; error: string | null }> {
  const payload = { ...inputPayload }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase.from('enquiries').insert(payload).select('*').single()

    if (!error) {
      return { data: normalizeEnquiry(data as Record<string, any>), error: null }
    }

    const missingColumn = parseMissingColumnFromError(error.message || '')
    if (!missingColumn || !(missingColumn in payload)) {
      return { data: null, error: error.message || 'Failed to insert lead' }
    }

    delete payload[missingColumn]
  }

  return { data: null, error: 'Failed to insert lead after schema fallback attempts' }
}

export async function resilientUpdateLead(
  supabase: SupabaseClient,
  id: string,
  inputPayload: Record<string, any>
): Promise<{ data: Enquiry | null; error: string | null }> {
  const payload = { ...inputPayload }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase
      .from('enquiries')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (!error) {
      return { data: normalizeEnquiry(data as Record<string, any>), error: null }
    }

    const missingColumn = parseMissingColumnFromError(error.message || '')
    if (!missingColumn || !(missingColumn in payload)) {
      return { data: null, error: error.message || 'Failed to update lead' }
    }

    delete payload[missingColumn]
  }

  return { data: null, error: 'Failed to update lead after schema fallback attempts' }
}

export function filterAndSortLeads(rows: Enquiry[], query: LeadQuery, options?: { skipStatusFilter?: boolean }) {
  const filtered = applyLeadFilters(rows, query, { skipStatusFilter: options?.skipStatusFilter })
  return sortLeads(filtered, query)
}
