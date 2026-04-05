import { z } from 'zod'

export const LEAD_STATUSES = ['new', 'contacted', 'enrolled', 'rejected'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const SORT_FIELDS = ['created_at', 'name', 'course', 'city', 'status'] as const
export type LeadSortField = (typeof SORT_FIELDS)[number]

export type LeadNote = {
  id: string
  text: string
  admin_name: string
  created_at: string
}

export type LeadActivity = {
  id: string
  type: 'created' | 'status_changed' | 'note_added' | 'updated'
  description: string
  from_status?: LeadStatus
  to_status?: LeadStatus
  admin_name?: string
  created_at: string
}

export type Enquiry = {
  id: string
  name: string | null
  email: string | null
  mobile: string | null
  course_interest: string | null
  city_interest: string | null
  budget: string | null
  exam_type: string | null
  class12_stream: string | null
  class12_percentage: number | null
  message: string | null
  status: LeadStatus
  source_page_slug: string | null
  source_page_title: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  admin_notes: string | null
  contact_channel: string | null
  notes_json: LeadNote[]
  activity_log: LeadActivity[]
  created_at: string | null
  updated_at: string | null
}

export type LeadQuery = {
  search: string
  status: 'all' | LeadStatus
  course: string[]
  city: string[]
  exam: string
  budget: string
  date_from: string
  date_to: string
  sort_by: LeadSortField
  sort_order: 'asc' | 'desc'
  page: number
  limit: number
  ids: string[]
}

export const leadBaseSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  mobile: z.string().trim().max(32).optional().nullable(),
  course_interest: z.string().trim().max(120).optional().nullable(),
  city_interest: z.string().trim().max(120).optional().nullable(),
  budget: z.string().trim().max(120).optional().nullable(),
  exam_type: z.string().trim().max(120).optional().nullable(),
  class12_stream: z.string().trim().max(80).optional().nullable(),
  class12_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(LEAD_STATUSES).optional(),
  source_page_slug: z.string().trim().max(240).optional().nullable(),
  source_page_title: z.string().trim().max(240).optional().nullable(),
  utm_source: z.string().trim().max(120).optional().nullable(),
  utm_medium: z.string().trim().max(120).optional().nullable(),
  utm_campaign: z.string().trim().max(120).optional().nullable(),
  admin_notes: z.string().trim().max(3000).optional().nullable(),
  contact_channel: z.enum(['Phone Call', 'WhatsApp', 'Walk-in', 'Other']).optional().nullable(),
})

export const leadCreateSchema = leadBaseSchema.refine(
  (value) => Boolean(value.name || value.email || value.mobile),
  'At least one of name, email, or mobile is required'
)

export const leadUpdateSchema = leadBaseSchema.extend({
  new_note: z.string().trim().max(1500).optional(),
})

export const leadBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  action: z.enum(['update_status', 'delete']),
  status: z.enum(LEAD_STATUSES).optional(),
})

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const parsed = String(value).trim()
  return parsed.length > 0 ? parsed : null
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeStatus(value: unknown): LeadStatus {
  const raw = String(value || 'new').toLowerCase().trim()
  if (raw === 'contacted') return 'contacted'
  if (raw === 'enrolled') return 'enrolled'
  if (raw === 'rejected') return 'rejected'
  return 'new'
}

export function normalizeEnquiry(row: Record<string, any>): Enquiry {
  const normalizedNotes = parseJsonArray<LeadNote>(row.notes_json).map((note) => ({
    id: String(note?.id || createId('note')),
    text: String(note?.text || ''),
    admin_name: String(note?.admin_name || 'Admin'),
    created_at: String(note?.created_at || new Date().toISOString()),
  }))

  const normalizedActivity = parseJsonArray<LeadActivity>(row.activity_log).map((entry) => ({
    id: String(entry?.id || createId('activity')),
    type: (entry?.type || 'updated') as LeadActivity['type'],
    description: String(entry?.description || 'Lead updated'),
    from_status: entry?.from_status,
    to_status: entry?.to_status,
    admin_name: entry?.admin_name ? String(entry.admin_name) : undefined,
    created_at: String(entry?.created_at || new Date().toISOString()),
  }))

  return {
    id: String(row.id),
    name: toStringOrNull(row.name),
    email: toStringOrNull(row.email),
    mobile: toStringOrNull(row.mobile),
    course_interest: toStringOrNull(row.course_interest ?? row.course),
    city_interest: toStringOrNull(row.city_interest ?? row.city),
    budget: toStringOrNull(row.budget ?? row.budget_range),
    exam_type: toStringOrNull(row.exam_type ?? row.exam),
    class12_stream: toStringOrNull(row.class12_stream),
    class12_percentage: toNumberOrNull(row.class12_percentage),
    message: toStringOrNull(row.message),
    status: normalizeStatus(row.status),
    source_page_slug: toStringOrNull(row.source_page_slug),
    source_page_title: toStringOrNull(row.source_page_title),
    utm_source: toStringOrNull(row.utm_source),
    utm_medium: toStringOrNull(row.utm_medium),
    utm_campaign: toStringOrNull(row.utm_campaign),
    admin_notes: toStringOrNull(row.admin_notes),
    contact_channel: toStringOrNull(row.contact_channel),
    notes_json: normalizedNotes,
    activity_log: normalizedActivity,
    created_at: toStringOrNull(row.created_at),
    updated_at: toStringOrNull(row.updated_at),
  }
}

function parseListParam(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key)
  if (values.length === 0) return []

  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed > 0 ? Math.floor(parsed) : fallback
}

export function parseLeadQuery(searchParams: URLSearchParams): LeadQuery {
  const sortBy = String(searchParams.get('sort_by') || 'created_at').trim() as LeadSortField
  const safeSortBy: LeadSortField = SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at'

  const sortOrder = String(searchParams.get('sort_order') || 'desc').toLowerCase()
  const safeSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc'

  const rawStatus = String(searchParams.get('status') || 'all').toLowerCase().trim()
  const status: 'all' | LeadStatus = rawStatus === 'all' ? 'all' : normalizeStatus(rawStatus)

  return {
    search: String(searchParams.get('search') || '').trim(),
    status,
    course: parseListParam(searchParams, 'course'),
    city: parseListParam(searchParams, 'city'),
    exam: String(searchParams.get('exam') || '').trim(),
    budget: String(searchParams.get('budget') || '').trim(),
    date_from: String(searchParams.get('date_from') || '').trim(),
    date_to: String(searchParams.get('date_to') || '').trim(),
    sort_by: safeSortBy,
    sort_order: safeSortOrder,
    page: parsePositiveInt(searchParams.get('page'), 1),
    limit: Math.min(100, parsePositiveInt(searchParams.get('limit'), 25)),
    ids: parseListParam(searchParams, 'ids'),
  }
}

function includesIgnoreCase(haystack: string | null | undefined, needle: string) {
  if (!needle) return true
  return String(haystack || '').toLowerCase().includes(needle.toLowerCase())
}

function sameDayOrAfter(dateIso: string | null, fromIso: string) {
  if (!fromIso) return true
  if (!dateIso) return false
  return new Date(dateIso).getTime() >= new Date(fromIso).getTime()
}

function sameDayOrBefore(dateIso: string | null, toIso: string) {
  if (!toIso) return true
  if (!dateIso) return false
  const toDate = new Date(toIso)
  toDate.setHours(23, 59, 59, 999)
  return new Date(dateIso).getTime() <= toDate.getTime()
}

export function applyLeadFilters(
  rows: Enquiry[],
  query: LeadQuery,
  options?: {
    skipStatusFilter?: boolean
    skipIdsFilter?: boolean
  }
): Enquiry[] {
  const skipStatusFilter = Boolean(options?.skipStatusFilter)
  const skipIdsFilter = Boolean(options?.skipIdsFilter)
  const idsSet = new Set(query.ids)

  return rows.filter((row) => {
    if (!skipIdsFilter && idsSet.size > 0 && !idsSet.has(row.id)) return false

    if (!skipStatusFilter && query.status !== 'all' && row.status !== query.status) return false

    if (query.course.length > 0 && !query.course.some((course) => includesIgnoreCase(row.course_interest, course))) {
      return false
    }

    if (query.city.length > 0 && !query.city.some((city) => includesIgnoreCase(row.city_interest, city))) {
      return false
    }

    if (query.exam && !includesIgnoreCase(row.exam_type, query.exam)) return false
    if (query.budget && !includesIgnoreCase(row.budget, query.budget)) return false

    if (!sameDayOrAfter(row.created_at, query.date_from)) return false
    if (!sameDayOrBefore(row.created_at, query.date_to)) return false

    if (query.search) {
      const hit = [
        row.name,
        row.email,
        row.mobile,
        row.course_interest,
        row.city_interest,
      ].some((field) => includesIgnoreCase(field, query.search))

      if (!hit) return false
    }

    return true
  })
}

function stringValue(value: string | null | undefined) {
  return String(value || '').toLowerCase()
}

export function sortLeads(rows: Enquiry[], query: LeadQuery): Enquiry[] {
  const cloned = [...rows]

  cloned.sort((a, b) => {
    let left: string | number = ''
    let right: string | number = ''

    if (query.sort_by === 'name') {
      left = stringValue(a.name)
      right = stringValue(b.name)
    } else if (query.sort_by === 'course') {
      left = stringValue(a.course_interest)
      right = stringValue(b.course_interest)
    } else if (query.sort_by === 'city') {
      left = stringValue(a.city_interest)
      right = stringValue(b.city_interest)
    } else if (query.sort_by === 'status') {
      left = stringValue(a.status)
      right = stringValue(b.status)
    } else {
      left = a.created_at ? new Date(a.created_at).getTime() : 0
      right = b.created_at ? new Date(b.created_at).getTime() : 0
    }

    if (left < right) return query.sort_order === 'asc' ? -1 : 1
    if (left > right) return query.sort_order === 'asc' ? 1 : -1
    return 0
  })

  return cloned
}

export function paginateLeads(rows: Enquiry[], page: number, limit: number) {
  const total = rows.length
  const safeLimit = Math.max(1, Math.min(100, limit))
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.max(1, Math.min(totalPages, page))
  const start = (safePage - 1) * safeLimit
  const end = start + safeLimit

  return {
    pageRows: rows.slice(start, end),
    total,
    totalPages,
    safePage,
  }
}

export function buildStatusCounts(rows: Enquiry[]) {
  const base = {
    all: rows.length,
    new: 0,
    contacted: 0,
    enrolled: 0,
    rejected: 0,
  }

  rows.forEach((row) => {
    base[row.status] += 1
  })

  return base
}

export function uniqueValues(rows: Enquiry[], key: 'course_interest' | 'city_interest' | 'exam_type' | 'budget') {
  const values = new Set<string>()
  rows.forEach((row) => {
    const value = String(row[key] || '').trim()
    if (value) values.add(value)
  })
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export function formatDateForExport(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export type LeadExportRow = {
  'S.No': number
  Name: string
  Email: string
  Mobile: string
  Course: string
  City: string
  Budget: string
  'Exam Type': string
  Stream: string
  'Class 12%': string
  Message: string
  Status: string
  'Source Page': string
  'UTM Source': string
  'UTM Medium': string
  'UTM Campaign': string
  'Submitted Date': string
  'Admin Notes': string
}

export function toExportRows(rows: Enquiry[]): LeadExportRow[] {
  return rows.map((row, index) => ({
    'S.No': index + 1,
    Name: row.name || '',
    Email: row.email || '',
    Mobile: row.mobile || '',
    Course: row.course_interest || '',
    City: row.city_interest || '',
    Budget: row.budget || '',
    'Exam Type': row.exam_type || '',
    Stream: row.class12_stream || '',
    'Class 12%': row.class12_percentage !== null ? String(row.class12_percentage) : '',
    Message: row.message || '',
    Status: row.status,
    'Source Page': row.source_page_slug || '',
    'UTM Source': row.utm_source || '',
    'UTM Medium': row.utm_medium || '',
    'UTM Campaign': row.utm_campaign || '',
    'Submitted Date': formatDateForExport(row.created_at),
    'Admin Notes': row.admin_notes || '',
  }))
}

export function buildActivityEntry(input: {
  type: LeadActivity['type']
  description: string
  from_status?: LeadStatus
  to_status?: LeadStatus
  admin_name?: string
}) {
  return {
    id: createId('activity'),
    type: input.type,
    description: input.description,
    from_status: input.from_status,
    to_status: input.to_status,
    admin_name: input.admin_name,
    created_at: new Date().toISOString(),
  } as LeadActivity
}

export function buildNoteEntry(text: string, adminName: string): LeadNote {
  return {
    id: createId('note'),
    text,
    admin_name: adminName || 'Admin',
    created_at: new Date().toISOString(),
  }
}
