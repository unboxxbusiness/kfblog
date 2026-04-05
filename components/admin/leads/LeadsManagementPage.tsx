'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  CircleX,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import AlertDialog from '../../ui/alert-dialog'
import { downloadCsv } from '../../../lib/csvExport'
import VirtualList from '../../VirtualList'
import {
  LEAD_STATUSES,
  type Enquiry,
  type LeadSortField,
  type LeadStatus,
  toExportRows,
} from '../../../lib/leads/shared'

type LeadsManagementPageProps = {
  initialCourses: string[]
  initialCities: string[]
  initialExamTypes: string[]
  initialBudgets: string[]
}

type LeadApiResponse = {
  data: Enquiry[]
  count: number
  pages: number
  current_page: number
  status_counts?: {
    all: number
    new: number
    contacted: number
    enrolled: number
    rejected: number
  }
  filter_options?: {
    courses?: string[]
    cities?: string[]
    exams?: string[]
    budgets?: string[]
  }
}

type LeadDetailTab = 'overview' | 'activity' | 'notes'

type SortOptionValue =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'course_asc'
  | 'city_asc'

const statusConfig: Record<LeadStatus, { label: string; className: string; bulkClassName: string }> = {
  new: {
    label: 'New',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    bulkClassName: 'bg-blue-600 hover:bg-blue-700',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    bulkClassName: 'bg-amber-500 hover:bg-amber-600',
  },
  enrolled: {
    label: 'Enrolled',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bulkClassName: 'bg-emerald-600 hover:bg-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    bulkClassName: 'bg-rose-600 hover:bg-rose-700',
  },
}

const addLeadFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.union([z.literal(''), z.string().trim().email('Invalid email')]),
  mobile: z.string().trim().max(32),
  course_interest: z.string().trim().max(120),
  city_interest: z.string().trim().max(120),
  budget: z.string().trim().max(120),
  exam_type: z.string().trim().max(120),
  class12_stream: z.string().trim().max(80),
  class12_percentage: z.string().trim(),
  message: z.string().trim().max(2000),
  status: z.enum(LEAD_STATUSES),
  source_page_slug: z.string().trim().max(240),
  source_page_title: z.string().trim().max(240),
  utm_source: z.string().trim().max(120),
  utm_medium: z.string().trim().max(120),
  utm_campaign: z.string().trim().max(120),
  admin_notes: z.string().trim().max(3000),
  contact_channel: z.enum(['Phone Call', 'WhatsApp', 'Walk-in', 'Other']),
})

type AddLeadFormValues = z.infer<typeof addLeadFormSchema>

const editLeadFormSchema = addLeadFormSchema.omit({ contact_channel: true })

type EditLeadFormValues = z.infer<typeof editLeadFormSchema>

function getAvatarColor(name: string | null) {
  const first = (name || 'A').charCodeAt(0)
  const palette = [
    'bg-[#dbeafe] text-[#1e40af]',
    'bg-[#dcfce7] text-[#166534]',
    'bg-[#fef3c7] text-[#92400e]',
    'bg-[#fee2e2] text-[#991b1b]',
    'bg-[#ede9fe] text-[#5b21b6]',
    'bg-[#cffafe] text-[#155e75]',
  ]
  return palette[first % palette.length]
}

function toInitials(name: string | null, email: string | null) {
  const base = (name || email || 'NA').trim()
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function normalizeStatus(value: string): LeadStatus {
  if (value === 'contacted') return 'contacted'
  if (value === 'enrolled') return 'enrolled'
  if (value === 'rejected') return 'rejected'
  return 'new'
}

function statusText(status: string | null) {
  return statusConfig[normalizeStatus(status || 'new')].label
}

function formatExactDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatRelativeDate(value: string | null) {
  if (!value) return '-'
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function parsePercentage(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (!Number.isFinite(num)) return null
  return Math.max(0, Math.min(100, num))
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toLeadPayload(values: Record<string, string>, includeContactChannel: boolean) {
  const basePayload: Record<string, any> = {
    name: toNullableString(values.name || ''),
    email: toNullableString(values.email || ''),
    mobile: toNullableString(values.mobile || ''),
    course_interest: toNullableString(values.course_interest || ''),
    city_interest: toNullableString(values.city_interest || ''),
    budget: toNullableString(values.budget || ''),
    exam_type: toNullableString(values.exam_type || ''),
    class12_stream: toNullableString(values.class12_stream || ''),
    class12_percentage: parsePercentage(values.class12_percentage || ''),
    message: toNullableString(values.message || ''),
    status: normalizeStatus(values.status || 'new'),
    source_page_slug: toNullableString(values.source_page_slug || ''),
    source_page_title: toNullableString(values.source_page_title || ''),
    utm_source: toNullableString(values.utm_source || ''),
    utm_medium: toNullableString(values.utm_medium || ''),
    utm_campaign: toNullableString(values.utm_campaign || ''),
    admin_notes: toNullableString(values.admin_notes || ''),
  }

  if (includeContactChannel) {
    basePayload.contact_channel = toNullableString(values.contact_channel || '')
  }

  return basePayload
}

function getCourseBadge(course: string | null) {
  const label = String(course || '').toLowerCase()
  if (label.includes('mba')) return 'bg-violet-100 text-violet-700 border-violet-200'
  if (label.includes('b.tech') || label.includes('btech')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (label.includes('mbbs')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (label.includes('bba')) return 'bg-cyan-100 text-cyan-700 border-cyan-200'
  if (label.includes('bca')) return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function buildPagination(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 'ellipsis', total]
  }

  if (current >= total - 2) {
    return [1, 'ellipsis', total - 3, total - 2, total - 1, total]
  }

  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total]
}

function exportLeadsToCsv(leads: Enquiry[], filename?: string) {
  const exportRows = toExportRows(leads)
  const headers = [
    'S.No',
    'Name',
    'Email',
    'Mobile',
    'Course',
    'City',
    'Budget',
    'Exam Type',
    'Stream',
    'Class 12%',
    'Message',
    'Status',
    'Source Page',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Submitted Date',
    'Admin Notes',
  ]

  const fallbackName = `kampus-filter-leads-${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv({
    rows: exportRows as Array<Record<string, unknown>>,
    headers,
    filename: filename || fallbackName,
  })
}

function MultiSelectFilter(props: {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const { label, options, selected, onChange, placeholder } = props
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }

    onChange([...selected, value])
  }

  return (
    <div className="relative" ref={containerRef}>
      <p className="mb-1 text-xs font-medium text-[#475569]">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#dbe3f1] bg-white px-3 text-sm text-[#1e293b] hover:bg-[#f8fafc]"
      >
        <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 text-[#64748b]" />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-[#dbe3f1] bg-white p-2 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[#64748b]">No options</p>
          ) : (
            options.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[#f8fafc]">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="h-4 w-4 rounded border-[#cbd5e1]"
                />
                <span className="truncate text-[#334155]">{option}</span>
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function ModalContainer(props: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  widthClass?: string
}) {
  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" onClick={props.onClose} className="absolute inset-0 bg-black/40" aria-label="Close modal" />

      <section className={`relative max-h-[90vh] w-full overflow-auto rounded-2xl border border-[#dbe3f1] bg-white p-5 shadow-2xl ${props.widthClass || 'max-w-3xl'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">{props.title}</h3>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe3f1] text-[#475569] hover:bg-[#f8fafc]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {props.children}
      </section>
    </div>
  )
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#475569]">{props.label}</span>
      {props.children}
    </label>
  )
}

function textInputClass() {
  return 'h-10 w-full rounded-md border border-[#dbe3f1] px-3 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20'
}

export default function LeadsManagementPage({
  initialCourses,
  initialCities,
  initialExamTypes,
  initialBudgets,
}: LeadsManagementPageProps) {
  const [rows, setRows] = React.useState<Enquiry[]>([])
  const [total, setTotal] = React.useState(0)
  const [pages, setPages] = React.useState(1)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [limit, setLimit] = React.useState(25)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [searchInput, setSearchInput] = React.useState('')
  const [searchDebounced, setSearchDebounced] = React.useState('')
  const [status, setStatus] = React.useState<'all' | LeadStatus>('all')
  const [selectedCourses, setSelectedCourses] = React.useState<string[]>([])
  const [selectedCities, setSelectedCities] = React.useState<string[]>([])
  const [exam, setExam] = React.useState('')
  const [budget, setBudget] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  const [sortBy, setSortBy] = React.useState<LeadSortField>('created_at')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')

  const [statusCounts, setStatusCounts] = React.useState({
    all: 0,
    new: 0,
    contacted: 0,
    enrolled: 0,
    rejected: 0,
  })

  const [dynamicCourses, setDynamicCourses] = React.useState<string[]>([])
  const [dynamicCities, setDynamicCities] = React.useState<string[]>([])
  const [dynamicExams, setDynamicExams] = React.useState<string[]>([])
  const [dynamicBudgets, setDynamicBudgets] = React.useState<string[]>([])

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [rowMenuLeadId, setRowMenuLeadId] = React.useState<string | null>(null)
  const [statusMenuLeadId, setStatusMenuLeadId] = React.useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false)

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailTab, setDetailTab] = React.useState<LeadDetailTab>('overview')
  const [detailLead, setDetailLead] = React.useState<Enquiry | null>(null)
  const [noteDraft, setNoteDraft] = React.useState('')

  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Enquiry | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null)

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false)

  const addForm = useForm<AddLeadFormValues>({
    resolver: zodResolver(addLeadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      course_interest: '',
      city_interest: '',
      budget: '',
      exam_type: '',
      class12_stream: '',
      class12_percentage: '',
      message: '',
      status: 'new',
      source_page_slug: '',
      source_page_title: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      admin_notes: '',
      contact_channel: 'Phone Call',
    },
  })

  const editForm = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadFormSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      course_interest: '',
      city_interest: '',
      budget: '',
      exam_type: '',
      class12_stream: '',
      class12_percentage: '',
      message: '',
      status: 'new',
      source_page_slug: '',
      source_page_title: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      admin_notes: '',
    },
  })

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  React.useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const element = event.target as HTMLElement
      if (!element.closest('[data-export-menu]') && !element.closest('[data-export-trigger]')) {
        setExportMenuOpen(false)
      }
      if (!element.closest('[data-row-menu]') && !element.closest('[data-row-menu-trigger]')) {
        setRowMenuLeadId(null)
      }
      if (!element.closest('[data-status-menu]') && !element.closest('[data-status-trigger]')) {
        setStatusMenuLeadId(null)
      }
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  const allCourseOptions = React.useMemo(() => {
    return Array.from(new Set([...initialCourses, ...dynamicCourses])).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [initialCourses, dynamicCourses])

  const allCityOptions = React.useMemo(() => {
    return Array.from(new Set([...initialCities, ...dynamicCities])).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [initialCities, dynamicCities])

  const allExamOptions = React.useMemo(() => {
    return Array.from(new Set([...initialExamTypes, ...dynamicExams])).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [initialExamTypes, dynamicExams])

  const allBudgetOptions = React.useMemo(() => {
    return Array.from(new Set([...initialBudgets, ...dynamicBudgets])).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [initialBudgets, dynamicBudgets])

  const selectedCount = selectedIds.size

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()

    if (searchDebounced) params.set('search', searchDebounced)
    if (status !== 'all') params.set('status', status)

    selectedCourses.forEach((item) => params.append('course', item))
    selectedCities.forEach((item) => params.append('city', item))

    if (exam) params.set('exam', exam)
    if (budget) params.set('budget', budget)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    params.set('page', String(currentPage))
    params.set('limit', String(limit))

    return params.toString()
  }, [
    searchDebounced,
    status,
    selectedCourses,
    selectedCities,
    exam,
    budget,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    currentPage,
    limit,
  ])

  const refreshData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/leads?${queryString}`, { cache: 'no-store' })
      const raw = await response.text()
      let payload: LeadApiResponse | { error?: string } | null = null

      if (raw) {
        try {
          payload = JSON.parse(raw) as LeadApiResponse | { error?: string }
        } catch {
          payload = null
        }
      }

      if (!response.ok) {
        throw new Error((payload as any)?.error || `Unable to load leads (${response.status})`)
      }

      if (!payload || !('data' in payload) || !Array.isArray((payload as LeadApiResponse).data)) {
        throw new Error('Unable to load leads')
      }

      const success = payload as LeadApiResponse
      setRows(success.data || [])
      setTotal(success.count || 0)
      setPages(success.pages || 1)
      setCurrentPage(success.current_page || 1)
      setStatusCounts(success.status_counts || { all: 0, new: 0, contacted: 0, enrolled: 0, rejected: 0 })

      setDynamicCourses(success.filter_options?.courses || [])
      setDynamicCities(success.filter_options?.cities || [])
      setDynamicExams(success.filter_options?.exams || [])
      setDynamicBudgets(success.filter_options?.budgets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load leads')
      setRows([])
      setTotal(0)
      setPages(1)
      toast.error('Failed to fetch leads.')
    } finally {
      setLoading(false)
    }
  }, [queryString])

  React.useEffect(() => {
    refreshData()
  }, [refreshData])

  const setSortPreset = (value: SortOptionValue) => {
    if (value === 'newest') {
      setSortBy('created_at')
      setSortOrder('desc')
      return
    }
    if (value === 'oldest') {
      setSortBy('created_at')
      setSortOrder('asc')
      return
    }
    if (value === 'name_asc') {
      setSortBy('name')
      setSortOrder('asc')
      return
    }
    if (value === 'name_desc') {
      setSortBy('name')
      setSortOrder('desc')
      return
    }
    if (value === 'course_asc') {
      setSortBy('course')
      setSortOrder('asc')
      return
    }
    setSortBy('city')
    setSortOrder('asc')
  }

  const onColumnSort = (column: LeadSortField) => {
    setCurrentPage(1)
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(column)
    setSortOrder(column === 'created_at' ? 'desc' : 'asc')
  }

  const activeFilters = React.useMemo(() => {
    const pills: Array<{ id: string; label: string; onRemove: () => void }> = []

    if (searchDebounced) {
      pills.push({ id: 'search', label: `Search: ${searchDebounced}`, onRemove: () => setSearchInput('') })
    }

    if (status !== 'all') {
      pills.push({ id: 'status', label: `Status: ${statusText(status)}`, onRemove: () => setStatus('all') })
    }

    selectedCourses.forEach((course) => {
      pills.push({
        id: `course-${course}`,
        label: `Course: ${course}`,
        onRemove: () => setSelectedCourses((prev) => prev.filter((item) => item !== course)),
      })
    })

    selectedCities.forEach((city) => {
      pills.push({
        id: `city-${city}`,
        label: `City: ${city}`,
        onRemove: () => setSelectedCities((prev) => prev.filter((item) => item !== city)),
      })
    })

    if (exam) pills.push({ id: 'exam', label: `Exam: ${exam}`, onRemove: () => setExam('') })
    if (budget) pills.push({ id: 'budget', label: `Budget: ${budget}`, onRemove: () => setBudget('') })
    if (dateFrom) pills.push({ id: 'from', label: `From: ${dateFrom}`, onRemove: () => setDateFrom('') })
    if (dateTo) pills.push({ id: 'to', label: `To: ${dateTo}`, onRemove: () => setDateTo('') })

    return pills
  }, [searchDebounced, status, selectedCourses, selectedCities, exam, budget, dateFrom, dateTo])

  const clearAllFilters = () => {
    setSearchInput('')
    setStatus('all')
    setSelectedCourses([])
    setSelectedCities([])
    setExam('')
    setBudget('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const allRowsSelectedOnPage = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allRowsSelectedOnPage) {
        rows.forEach((row) => next.delete(row.id))
      } else {
        rows.forEach((row) => next.add(row.id))
      }
      return next
    })
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateLeadInState = (updatedLead: Enquiry) => {
    setRows((prev) => prev.map((row) => (row.id === updatedLead.id ? updatedLead : row)))
    setDetailLead((prev) => (prev?.id === updatedLead.id ? updatedLead : prev))
    if (editTarget?.id === updatedLead.id) setEditTarget(updatedLead)
  }

  const updateLeadStatus = async (leadId: string, nextStatus: LeadStatus) => {
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to update status')
      return
    }

    updateLeadInState(payload.data as Enquiry)
    setStatusMenuLeadId(null)
    toast.success(`Lead marked as ${statusText(nextStatus)}`)
    refreshData()
  }

  const handleBulkStatusUpdate = async (nextStatus: LeadStatus) => {
    if (selectedIds.size === 0) return

    const response = await fetch('/api/admin/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: Array.from(selectedIds),
        action: 'update_status',
        status: nextStatus,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Bulk update failed')
      return
    }

    toast.success(`Updated ${payload.affected || 0} leads`) 
    refreshData()
  }

  const deleteSingleLead = async () => {
    if (!deleteTarget) return

    const response = await fetch(`/api/admin/leads/${deleteTarget.id}`, {
      method: 'DELETE',
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to delete lead')
      return
    }

    setDeleteDialogOpen(false)
    setDeleteTarget(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(deleteTarget.id)
      return next
    })

    if (detailLead?.id === deleteTarget.id) {
      setDetailOpen(false)
      setDetailLead(null)
    }

    toast.success('Lead deleted successfully')
    refreshData()
  }

  const deleteSelectedLeads = async () => {
    if (selectedIds.size === 0) return

    const response = await fetch('/api/admin/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: Array.from(selectedIds),
        action: 'delete',
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to delete selected leads')
      return
    }

    setBulkDeleteDialogOpen(false)
    setSelectedIds(new Set())
    toast.success(`Deleted ${payload.affected || 0} leads`)
    refreshData()
  }

  const buildExportQuery = (mode: 'current' | 'all' | 'selected') => {
    const params = new URLSearchParams()

    if (mode === 'current') {
      if (searchDebounced) params.set('search', searchDebounced)
      if (status !== 'all') params.set('status', status)
      selectedCourses.forEach((course) => params.append('course', course))
      selectedCities.forEach((city) => params.append('city', city))
      if (exam) params.set('exam', exam)
      if (budget) params.set('budget', budget)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      params.set('sort_by', sortBy)
      params.set('sort_order', sortOrder)
    }

    if (mode === 'selected') {
      Array.from(selectedIds).forEach((id) => params.append('ids', id))
    }

    return params.toString()
  }

  const handleExport = async (mode: 'current' | 'all' | 'selected') => {
    if (mode === 'selected' && selectedIds.size === 0) {
      toast.error('Select at least one lead')
      return
    }

    const query = buildExportQuery(mode)
    const url = query ? `/api/admin/leads/export?${query}` : '/api/admin/leads/export'

    const response = await fetch(url, { cache: 'no-store' })
    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Export failed')
      return
    }

    const exportedRows = (payload.data || []) as Enquiry[]
    const datePrefix = new Date().toISOString().slice(0, 10)

    if (mode === 'current') {
      exportLeadsToCsv(exportedRows, `kampus-filter-leads-current-view-${datePrefix}.csv`)
    } else if (mode === 'selected') {
      exportLeadsToCsv(exportedRows, `kampus-filter-leads-selected-${datePrefix}.csv`)
    } else {
      exportLeadsToCsv(exportedRows, `kampus-filter-leads-${datePrefix}.csv`)
    }

    toast.success(`Exported ${exportedRows.length} leads to CSV`)
    setExportMenuOpen(false)
  }

  const openDetail = async (leadId: string, tab: LeadDetailTab = 'overview') => {
    setDetailOpen(true)
    setDetailTab(tab)
    setDetailLoading(true)

    const onPageLead = rows.find((row) => row.id === leadId)
    if (onPageLead) {
      setDetailLead(onPageLead)
    }

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to fetch lead details')
      }

      setDetailLead(payload.data as Enquiry)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to fetch lead details')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveNote = async () => {
    if (!detailLead || !noteDraft.trim()) return

    const response = await fetch(`/api/admin/leads/${detailLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_note: noteDraft.trim() }),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to save note')
      return
    }

    setNoteDraft('')
    updateLeadInState(payload.data as Enquiry)
    toast.success('Note added successfully')
  }

  const openEditModal = (lead: Enquiry) => {
    setEditTarget(lead)
    editForm.reset({
      name: lead.name || '',
      email: lead.email || '',
      mobile: lead.mobile || '',
      course_interest: lead.course_interest || '',
      city_interest: lead.city_interest || '',
      budget: lead.budget || '',
      exam_type: lead.exam_type || '',
      class12_stream: lead.class12_stream || '',
      class12_percentage: lead.class12_percentage !== null ? String(lead.class12_percentage) : '',
      message: lead.message || '',
      status: lead.status,
      source_page_slug: lead.source_page_slug || '',
      source_page_title: lead.source_page_title || '',
      utm_source: lead.utm_source || '',
      utm_medium: lead.utm_medium || '',
      utm_campaign: lead.utm_campaign || '',
      admin_notes: lead.admin_notes || '',
    })
    setEditModalOpen(true)
  }

  const onSubmitEdit = editForm.handleSubmit(async (values) => {
    if (!editTarget) return

    const response = await fetch(`/api/admin/leads/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toLeadPayload(values as unknown as Record<string, string>, false)),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to update lead')
      return
    }

    updateLeadInState(payload.data as Enquiry)
    setEditModalOpen(false)
    toast.success('Lead updated successfully')
    refreshData()
  })

  const onSubmitAdd = addForm.handleSubmit(async (values) => {
    const response = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toLeadPayload(values as unknown as Record<string, string>, true)),
    })

    const payload = await response.json()

    if (!response.ok) {
      toast.error(payload.error || 'Failed to add lead')
      return
    }

    addForm.reset()
    setAddModalOpen(false)
    toast.success('Lead added successfully')
    refreshData()
  })

  const openDeleteDialogForLead = (lead: Enquiry) => {
    setDeleteTarget({
      id: lead.id,
      name: lead.name || lead.email || 'Unknown lead',
    })
    setDeleteDialogOpen(true)
  }

  const firstRowIndex = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const lastRowIndex = Math.min(total, currentPage * limit)
  const paginationButtons = buildPagination(currentPage, pages)

  const hasFilters = activeFilters.length > 0

  const timelineItems = React.useMemo(() => {
    if (!detailLead) return []

    const activity = [...(detailLead.activity_log || [])]

    if (detailLead.created_at) {
      activity.push({
        id: 'created-fallback',
        type: 'created',
        description: 'Lead was created',
        created_at: detailLead.created_at,
      } as any)
    }

    if (detailLead.updated_at && detailLead.updated_at !== detailLead.created_at) {
      activity.push({
        id: 'updated-fallback',
        type: 'updated',
        description: 'Lead was last updated',
        created_at: detailLead.updated_at,
      } as any)
    }

    const deduped = new Map<string, any>()
    activity.forEach((item) => {
      const key = `${item.type}-${item.description}-${item.created_at}`
      if (!deduped.has(key)) deduped.set(key, item)
    })

    return Array.from(deduped.values()).sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime()
      const right = new Date(b.created_at || 0).getTime()
      return right - left
    })
  }, [detailLead])

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbe3f1] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Leads Management</h1>
          <p className="mt-1 text-sm text-[#64748b]">{total} total leads</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#dbe3f1] text-[#475569] hover:bg-[#f8fafc]"
            aria-label="Refresh leads"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              data-export-trigger
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dbe3f1] bg-white px-3 text-sm font-medium text-[#334155] hover:bg-[#f8fafc]"
            >
              <Download className="h-4 w-4" />
              Export Excel
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>

            {exportMenuOpen ? (
              <div data-export-menu className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-[#dbe3f1] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => handleExport('current')}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  Export Current View
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('all')}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
                >
                  Export All Leads
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() => handleExport('selected')}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export Selected
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#4f46e5] px-3 text-sm font-semibold text-white hover:bg-[#4338ca]"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dbe3f1] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#64748b]" />
            <input
              value={searchInput}
              onChange={(event) => {
                setCurrentPage(1)
                setSearchInput(event.target.value)
              }}
              placeholder="Search by name, email, mobile, course, city..."
              className="h-11 w-full rounded-md border border-[#dbe3f1] bg-white pl-10 pr-10 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setCurrentPage(1)
                }}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {(['all', 'new', 'contacted', 'enrolled', 'rejected'] as const).map((item) => {
              const isActive = status === item
              const count = statusCounts[item] || 0
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setCurrentPage(1)
                    setStatus(item)
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-[#4f46e5] bg-[#4f46e5] text-white'
                      : 'border-[#dbe3f1] bg-white text-[#334155] hover:bg-[#f8fafc]'
                  }`}
                >
                  {item === 'all' ? 'All' : statusText(item)}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-[#eef2ff] text-[#3730a3]'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc]"
          >
            <Filter className="h-3.5 w-3.5" />
            More Filters
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <AnimatePresence>
          {advancedOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <MultiSelectFilter
                  label="Course"
                  options={allCourseOptions}
                  selected={selectedCourses}
                  onChange={(next) => {
                    setCurrentPage(1)
                    setSelectedCourses(next)
                  }}
                  placeholder="All courses"
                />

                <MultiSelectFilter
                  label="City"
                  options={allCityOptions}
                  selected={selectedCities}
                  onChange={(next) => {
                    setCurrentPage(1)
                    setSelectedCities(next)
                  }}
                  placeholder="All cities"
                />

                <Field label="From">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setCurrentPage(1)
                      setDateFrom(event.target.value)
                    }}
                    className={textInputClass()}
                  />
                </Field>

                <Field label="To">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setCurrentPage(1)
                      setDateTo(event.target.value)
                    }}
                    className={textInputClass()}
                  />
                </Field>

                <Field label="Exam Type">
                  <select
                    value={exam}
                    onChange={(event) => {
                      setCurrentPage(1)
                      setExam(event.target.value)
                    }}
                    className={textInputClass()}
                  >
                    <option value="">All exams</option>
                    {allExamOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Budget">
                  <select
                    value={budget}
                    onChange={(event) => {
                      setCurrentPage(1)
                      setBudget(event.target.value)
                    }}
                    className={textInputClass()}
                  >
                    <option value="">All budgets</option>
                    {allBudgetOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-3">
                <Field label="Sort By">
                  <select
                    value={`${sortBy}_${sortOrder}`}
                    onChange={(event) => {
                      setCurrentPage(1)
                      setSortPreset(event.target.value as SortOptionValue)
                    }}
                    className={`${textInputClass()} max-w-sm`}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                    <option value="course_asc">Course</option>
                    <option value="city_asc">City</option>
                  </select>
                </Field>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {hasFilters ? (
          <div className="mt-3 border-t border-[#e2e8f0] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={filter.onRemove}
                  className="inline-flex items-center gap-1 rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#3730a3]"
                >
                  {filter.label}
                  <X className="h-3 w-3" />
                </button>
              ))}

              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-[#4f46e5] hover:text-[#4338ca]"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {selectedCount > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-sm font-semibold text-[#312e81]">{selectedCount} leads selected</p>

              {(['new', 'contacted', 'enrolled', 'rejected'] as LeadStatus[]).map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => handleBulkStatusUpdate(state)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold text-white ${statusConfig[state].bulkClassName}`}
                >
                  Mark as {statusConfig[state].label}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-[#c7d2fe]" />

              <button
                type="button"
                onClick={() => handleExport('selected')}
                className="rounded-md bg-[#475569] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#334155]"
              >
                Export Selected
              </button>

              <button
                type="button"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="rounded-md bg-[#dc2626] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#b91c1c]"
              >
                Delete Selected
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs font-semibold text-[#4338ca] hover:text-[#3730a3]"
              >
                Deselect All
              </button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {error ? (
        <section className="rounded-xl border border-[#fecaca] bg-[#fff7f7] px-4 py-3">
          <p className="text-sm font-semibold text-[#b91c1c]">Unable to load leads</p>
          <p className="mt-1 text-xs text-[#7f1d1d]">{error}</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#dbe3f1] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-[#e2e8f0] text-left">
                <th className="w-[40px] px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allRowsSelectedOnPage}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded border-[#cbd5e1]"
                  />
                </th>
                <th className="w-[48px] px-2 py-3 text-xs font-semibold text-[#475569]">#</th>

                <th className="w-[160px] px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onColumnSort('name')}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  >
                    Name
                    <ChevronsUpDown className={`h-3.5 w-3.5 ${sortBy === 'name' ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
                  </button>
                </th>

                <th className="w-[200px] px-2 py-3 text-xs font-semibold text-[#475569]">Contact</th>

                <th className="w-[120px] px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onColumnSort('course')}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  >
                    Course
                    <ChevronsUpDown className={`h-3.5 w-3.5 ${sortBy === 'course' ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
                  </button>
                </th>

                <th className="w-[100px] px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onColumnSort('city')}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  >
                    City
                    <ChevronsUpDown className={`h-3.5 w-3.5 ${sortBy === 'city' ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
                  </button>
                </th>

                <th className="w-[110px] px-2 py-3 text-xs font-semibold text-[#475569]">Budget</th>
                <th className="w-[100px] px-2 py-3 text-xs font-semibold text-[#475569]">Exam</th>

                <th className="w-[110px] px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onColumnSort('status')}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  >
                    Status
                    <ChevronsUpDown className={`h-3.5 w-3.5 ${sortBy === 'status' ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
                  </button>
                </th>

                <th className="w-[130px] px-2 py-3 text-xs font-semibold text-[#475569]">Source</th>

                <th className="w-[120px] px-2 py-3">
                  <button
                    type="button"
                    onClick={() => onColumnSort('created_at')}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  >
                    Date
                    <ChevronsUpDown className={`h-3.5 w-3.5 ${sortBy === 'created_at' ? 'text-[#4f46e5]' : 'text-[#94a3b8]'}`} />
                  </button>
                </th>

                <th className="w-[60px] px-2 py-3 text-xs font-semibold text-[#475569]">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-[#f1f5f9]">
                      <td className="px-2 py-3"><div className="h-4 w-4 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-3 w-6 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-8 w-28 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-8 w-36 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-6 w-20 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-6 w-16 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-6 w-20 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[#e2e8f0]" /></td>
                      <td className="px-2 py-3"><div className="h-6 w-8 animate-pulse rounded bg-[#e2e8f0]" /></td>
                    </tr>
                  ))
                : rows.length === 0
                ? null
                : rows.length > 100
                ? (
                    <tr>
                      <td colSpan={12} className="px-0 py-0">
                        <VirtualList
                          items={rows}
                          height={Math.min(820, Math.max(460, rows.length * 72))}
                          itemHeight={72}
                          className="border-t border-[#f1f5f9]"
                          renderItem={({ item: row, index }) => {
                            const selected = selectedIds.has(row.id)
                            const statusValue = normalizeStatus(row.status)

                            return (
                              <div
                                className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-[#f1f5f9] px-3 py-2 ${selected ? 'bg-indigo-50/70' : 'bg-white'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSelectOne(row.id)}
                                  className="h-4 w-4 rounded border-[#cbd5e1]"
                                />

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#0f172a]">
                                    {(currentPage - 1) * limit + index + 1}. {row.name || row.email || 'Unnamed Lead'}
                                  </p>
                                  <p className="truncate text-xs text-[#64748b]">
                                    {row.course_interest || '-'} | {row.city_interest || '-'} | {row.mobile || '-'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusConfig[statusValue].className}`}>
                                    {statusText(row.status)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openDetail(row.id, 'overview')}
                                    className="rounded-md border border-[#dbe3f1] px-2 py-1 text-xs text-[#334155] hover:bg-[#f8fafc]"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            )
                          }}
                        />
                      </td>
                    </tr>
                  )
                : rows.map((row, index) => {
                    const selected = selectedIds.has(row.id)
                    const statusValue = normalizeStatus(row.status)
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-[#f1f5f9] transition-colors hover:bg-[#f8fafc] ${
                          selected ? 'bg-indigo-50/70' : 'bg-white'
                        } ${statusValue === 'new' ? 'border-l-[3px] border-l-[#4f46e5]' : 'border-l-[3px] border-l-transparent'}`}
                      >
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectOne(row.id)}
                            className="h-4 w-4 rounded border-[#cbd5e1]"
                          />
                        </td>

                        <td className="px-2 py-3 text-xs text-[#94a3b8]">{(currentPage - 1) * limit + index + 1}</td>

                        <td className="px-2 py-3">
                          <div className="flex items-start gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(row.name || row.email)}`}>
                              {toInitials(row.name, row.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#0f172a]">{row.name || 'Unnamed Lead'}</p>
                              {row.message ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-xs text-[#6366f1]" title={row.message}>
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Message
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!row.email) return
                                navigator.clipboard.writeText(row.email)
                                toast.success('Email copied')
                              }}
                              className="inline-flex max-w-full items-center gap-1 text-left text-xs text-[#334155] hover:text-[#111827]"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{row.email || '-'}</span>
                              {row.email ? <Copy className="h-3 w-3 shrink-0 text-[#94a3b8]" /> : null}
                            </button>

                            <a href={row.mobile ? `tel:${row.mobile}` : '#'} className="inline-flex max-w-full items-center gap-1 text-xs text-[#64748b] hover:text-[#334155]">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{row.mobile || '-'}</span>
                            </a>
                          </div>
                        </td>

                        <td className="px-2 py-3">
                          <span className={`inline-flex max-w-[110px] truncate rounded-full border px-2 py-0.5 text-xs font-semibold ${getCourseBadge(row.course_interest)}`}>
                            {row.course_interest || '-'}
                          </span>
                        </td>

                        <td className="px-2 py-3 text-xs text-[#334155]">{row.city_interest || '-'}</td>
                        <td className="px-2 py-3 text-xs text-[#64748b]">{row.budget || '-'}</td>

                        <td className="px-2 py-3">
                          <span className="inline-flex max-w-[90px] truncate rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-xs font-medium text-[#475569]">
                            {row.exam_type || '-'}
                          </span>
                        </td>

                        <td className="px-2 py-3">
                          <div className="relative">
                            <button
                              data-status-trigger
                              type="button"
                              onClick={() => setStatusMenuLeadId((prev) => (prev === row.id ? null : row.id))}
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusConfig[statusValue].className}`}
                            >
                              {statusText(row.status)}
                            </button>

                            {statusMenuLeadId === row.id ? (
                              <div data-status-menu className="absolute z-30 mt-2 w-36 rounded-md border border-[#dbe3f1] bg-white p-1 shadow-lg">
                                {LEAD_STATUSES.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => updateLeadStatus(row.id, option)}
                                    className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                                  >
                                    Mark as {statusText(option)}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-2 py-3 text-xs">
                          {row.source_page_slug ? (
                            <a
                              href={`/${row.source_page_slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-[110px] items-center gap-1 text-[#334155] hover:text-[#1e3a8a]"
                              title={row.source_page_slug}
                            >
                              <span className="truncate">{row.source_page_slug}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[#94a3b8]">-</span>
                          )}
                        </td>

                        <td className="px-2 py-3 text-xs text-[#64748b]" title={formatExactDate(row.created_at)}>
                          {formatRelativeDate(row.created_at)}
                        </td>

                        <td className="px-2 py-3">
                          <div className="relative">
                            <button
                              data-row-menu-trigger
                              type="button"
                              onClick={() => setRowMenuLeadId((prev) => (prev === row.id ? null : row.id))}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dbe3f1] text-[#64748b] hover:bg-[#f8fafc]"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {rowMenuLeadId === row.id ? (
                              <div data-row-menu className="absolute right-0 z-30 mt-2 w-40 rounded-md border border-[#dbe3f1] bg-white p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuLeadId(null)
                                    openDetail(row.id, 'overview')
                                  }}
                                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                                >
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuLeadId(null)
                                    openEditModal(row)
                                  }}
                                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuLeadId(null)
                                    setStatusMenuLeadId(row.id)
                                  }}
                                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                                >
                                  Change Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuLeadId(null)
                                    openDetail(row.id, 'notes')
                                  }}
                                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                                >
                                  Add Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuLeadId(null)
                                    openDeleteDialogForLead(row)
                                  }}
                                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>

          {!loading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="18" width="64" height="48" rx="10" fill="#EEF2FF" stroke="#C7D2FE" />
                <path d="M22 34H62" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
                <path d="M22 44H50" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="58" r="10" fill="#E0E7FF" />
                <path d="M56 58L59 61L64 56" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <h3 className="mt-4 text-lg font-semibold text-[#0f172a]">No leads found</h3>

              {hasFilters ? (
                <>
                  <p className="mt-1 text-sm text-[#64748b]">Try clearing your filters to broaden your results.</p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-3 inline-flex items-center gap-1 rounded-md border border-[#dbe3f1] px-3 py-2 text-sm font-medium text-[#334155] hover:bg-[#f8fafc]"
                  >
                    <CircleX className="h-4 w-4" />
                    Clear Filters
                  </button>
                </>
              ) : (
                <p className="mt-1 text-sm text-[#64748b]">No enquiries yet. Share your Apply Now link to get started.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] px-4 py-3">
          <p className="text-xs text-[#64748b]">Showing {firstRowIndex}-{lastRowIndex} of {total} leads</p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="rounded-md border border-[#dbe3f1] px-2 py-1 text-xs text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {paginationButtons.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#94a3b8]">
                    ...
                  </span>
                )
              }

              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    item === currentPage
                      ? 'bg-[#4f46e5] text-white'
                      : 'border border-[#dbe3f1] text-[#334155] hover:bg-[#f8fafc]'
                  }`}
                >
                  {item}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(pages, prev + 1))}
              disabled={currentPage >= pages}
              className="rounded-md border border-[#dbe3f1] px-2 py-1 text-xs text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748b]">Rows per page</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                setCurrentPage(1)
                setLimit(Number(event.target.value))
              }}
              className="h-8 rounded-md border border-[#dbe3f1] px-2 text-xs text-[#334155]"
            >
              {[10, 25, 50, 100, 200].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {detailOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[91] bg-black/35"
              onClick={() => setDetailOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.aside
              initial={{ x: 520 }}
              animate={{ x: 0 }}
              exit={{ x: 520 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed right-0 top-0 z-[92] h-full w-full max-w-[480px] border-l border-[#dbe3f1] bg-white shadow-2xl"
            >
              <div className="flex h-full flex-col">
                <header className="border-b border-[#e2e8f0] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#0f172a]">Lead Details</h3>
                      {detailLead ? <p className="mt-1 text-xs text-[#64748b]">ID: {detailLead.id}</p> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {detailLead ? (
                        <select
                          value={detailLead.status}
                          onChange={(event) => updateLeadStatus(detailLead.id, normalizeStatus(event.target.value))}
                          className="h-8 rounded-md border border-[#dbe3f1] px-2 text-xs font-semibold"
                        >
                          {LEAD_STATUSES.map((state) => (
                            <option key={state} value={state}>
                              {statusText(state)}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe3f1] text-[#64748b] hover:bg-[#f8fafc]"
                        title="Open in full page (coming soon)"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe3f1] text-[#64748b] hover:bg-[#f8fafc]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-1 rounded-md bg-[#f1f5f9] p-1">
                    {(['overview', 'activity', 'notes'] as LeadDetailTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDetailTab(tab)}
                        className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold capitalize ${
                          detailTab === tab ? 'bg-white text-[#312e81] shadow-sm' : 'text-[#475569]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {detailLoading || !detailLead ? (
                    <div className="space-y-3">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-[#e2e8f0]" />
                      ))}
                    </div>
                  ) : detailTab === 'overview' ? (
                    <div className="space-y-5">
                      <section className="rounded-xl border border-[#e2e8f0] p-4">
                        <h4 className="text-sm font-semibold text-[#0f172a]">Student Profile</h4>
                        <div className="mt-3 flex items-start gap-3">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${getAvatarColor(detailLead.name || detailLead.email)}`}>
                            {toInitials(detailLead.name, detailLead.email)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5 className="text-lg font-semibold text-[#0f172a]">{detailLead.name || 'Unnamed Lead'}</h5>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!detailLead.email) return
                                  navigator.clipboard.writeText(detailLead.email)
                                  toast.success('Email copied')
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-[#dbe3f1] px-2 py-1 text-[#334155] hover:bg-[#f8fafc]"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                {detailLead.email || '-'}
                                {detailLead.email ? <Copy className="h-3 w-3" /> : null}
                              </button>

                              <a
                                href={detailLead.mobile ? `tel:${detailLead.mobile}` : '#'}
                                className="inline-flex items-center gap-1 rounded-md border border-[#dbe3f1] px-2 py-1 text-[#334155] hover:bg-[#f8fafc]"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                {detailLead.mobile || '-'}
                              </a>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-[#e2e8f0] p-4">
                        <h4 className="text-sm font-semibold text-[#0f172a]">Course Preferences</h4>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div><p className="text-[#64748b]">Course</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.course_interest || '-'}</p></div>
                          <div><p className="text-[#64748b]">City</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.city_interest || '-'}</p></div>
                          <div><p className="text-[#64748b]">Budget</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.budget || '-'}</p></div>
                          <div><p className="text-[#64748b]">Exam</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.exam_type || '-'}</p></div>
                          <div><p className="text-[#64748b]">Class 12 Stream</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.class12_stream || '-'}</p></div>
                          <div><p className="text-[#64748b]">Expected %</p><p className="mt-1 font-medium text-[#0f172a]">{detailLead.class12_percentage ?? '-'}</p></div>
                        </div>
                        {detailLead.message ? (
                          <blockquote className="mt-3 rounded-md border-l-4 border-[#c7d2fe] bg-[#f8fbff] px-3 py-2 text-xs text-[#334155]">
                            {detailLead.message}
                          </blockquote>
                        ) : null}
                      </section>

                      <section className="rounded-xl border border-[#e2e8f0] p-4">
                        <h4 className="text-sm font-semibold text-[#0f172a]">Source Tracking</h4>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">Source page</span>
                            {detailLead.source_page_slug ? (
                              <a
                                href={`/${detailLead.source_page_slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-[#1d4ed8] hover:text-[#1e40af]"
                              >
                                {detailLead.source_page_slug}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="font-medium text-[#334155]">-</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">Source title</span>
                            <span className="font-medium text-[#334155]">{detailLead.source_page_title || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">UTM Source</span>
                            <span className="font-medium text-[#334155]">{detailLead.utm_source || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">UTM Medium</span>
                            <span className="font-medium text-[#334155]">{detailLead.utm_medium || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">UTM Campaign</span>
                            <span className="font-medium text-[#334155]">{detailLead.utm_campaign || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#64748b]">Submitted</span>
                            <span className="font-medium text-[#334155]">{formatExactDate(detailLead.created_at)}</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  ) : detailTab === 'activity' ? (
                    <section className="space-y-3">
                      {timelineItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#dbe3f1] bg-[#f8fafc] p-4 text-center text-sm text-[#64748b]">
                          No activity yet.
                        </div>
                      ) : (
                        timelineItems.map((entry) => (
                          <article key={entry.id} className="relative rounded-lg border border-[#e2e8f0] bg-white p-3 pl-7">
                            <span className="absolute left-3 top-4 h-2.5 w-2.5 rounded-full bg-[#4f46e5]" />
                            <p className="text-sm font-medium text-[#0f172a]">{entry.description}</p>
                            <p className="mt-1 text-xs text-[#64748b]">
                              {formatExactDate(entry.created_at)}
                              {entry.admin_name ? ` by ${entry.admin_name}` : ''}
                            </p>
                          </article>
                        ))
                      )}

                      <p className="text-xs text-[#94a3b8]">
                        Full audit timeline can be extended with a dedicated audit table in a future update.
                      </p>
                    </section>
                  ) : (
                    <section className="space-y-3">
                      {detailLead.notes_json.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#dbe3f1] bg-[#f8fafc] p-4 text-center text-sm text-[#64748b]">
                          No notes yet.
                        </div>
                      ) : (
                        detailLead.notes_json
                          .slice()
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((note) => (
                            <article key={note.id} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                              <p className="text-sm text-[#1e293b]">{note.text}</p>
                              <p className="mt-1 text-xs text-[#64748b]">
                                {note.admin_name} · {formatExactDate(note.created_at)}
                              </p>
                            </article>
                          ))
                      )}

                      <div className="rounded-xl border border-[#e2e8f0] p-3">
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder="Add a note..."
                          className="h-24 w-full resize-none rounded-md border border-[#dbe3f1] p-2 text-sm text-[#0f172a] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={saveNote}
                            className="rounded-md bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4338ca]"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                {detailLead ? (
                  <footer className="sticky bottom-0 border-t border-[#e2e8f0] bg-white px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateLeadStatus(detailLead.id, 'contacted')}
                        className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                      >
                        Mark as Contacted
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLeadStatus(detailLead.id, 'enrolled')}
                        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Mark as Enrolled
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailOpen(false)
                          openDeleteDialogForLead(detailLead)
                        }}
                        className="ml-auto rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Delete Lead
                      </button>
                    </div>
                  </footer>
                ) : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <ModalContainer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Lead">
        <form className="space-y-4" onSubmit={onSubmitEdit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Name">
              <input {...editForm.register('name')} className={textInputClass()} />
              {editForm.formState.errors.name ? <p className="mt-1 text-xs text-rose-600">{editForm.formState.errors.name.message}</p> : null}
            </Field>

            <Field label="Email">
              <input {...editForm.register('email')} className={textInputClass()} />
              {editForm.formState.errors.email ? <p className="mt-1 text-xs text-rose-600">{editForm.formState.errors.email.message}</p> : null}
            </Field>

            <Field label="Mobile"><input {...editForm.register('mobile')} className={textInputClass()} /></Field>
            <Field label="Course"><input {...editForm.register('course_interest')} className={textInputClass()} /></Field>
            <Field label="City"><input {...editForm.register('city_interest')} className={textInputClass()} /></Field>
            <Field label="Budget"><input {...editForm.register('budget')} className={textInputClass()} /></Field>
            <Field label="Exam"><input {...editForm.register('exam_type')} className={textInputClass()} /></Field>
            <Field label="Status">
              <select {...editForm.register('status')} className={textInputClass()}>
                {LEAD_STATUSES.map((item) => (
                  <option key={item} value={item}>{statusText(item)}</option>
                ))}
              </select>
            </Field>
            <Field label="Class 12 Stream"><input {...editForm.register('class12_stream')} className={textInputClass()} /></Field>
            <Field label="Class 12 %"><input {...editForm.register('class12_percentage')} className={textInputClass()} /></Field>
            <Field label="Source Page Slug"><input {...editForm.register('source_page_slug')} className={textInputClass()} /></Field>
            <Field label="Source Page Title"><input {...editForm.register('source_page_title')} className={textInputClass()} /></Field>
            <Field label="UTM Source"><input {...editForm.register('utm_source')} className={textInputClass()} /></Field>
            <Field label="UTM Medium"><input {...editForm.register('utm_medium')} className={textInputClass()} /></Field>
            <Field label="UTM Campaign"><input {...editForm.register('utm_campaign')} className={textInputClass()} /></Field>
          </div>

          <Field label="Message">
            <textarea {...editForm.register('message')} className="h-20 w-full rounded-md border border-[#dbe3f1] p-2 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20" />
          </Field>

          <Field label="Admin Notes">
            <textarea {...editForm.register('admin_notes')} className="h-24 w-full rounded-md border border-[#dbe3f1] p-2 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20" />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditModalOpen(false)} className="rounded-md border border-[#dbe3f1] px-3 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]">
              Cancel
            </button>
            <button type="submit" disabled={editForm.formState.isSubmitting} className="rounded-md bg-[#4f46e5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-60">
              {editForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </ModalContainer>

      <ModalContainer open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Manual Lead">
        <form className="space-y-4" onSubmit={onSubmitAdd}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Name">
              <input {...addForm.register('name')} className={textInputClass()} />
              {addForm.formState.errors.name ? <p className="mt-1 text-xs text-rose-600">{addForm.formState.errors.name.message}</p> : null}
            </Field>

            <Field label="Email">
              <input {...addForm.register('email')} className={textInputClass()} />
              {addForm.formState.errors.email ? <p className="mt-1 text-xs text-rose-600">{addForm.formState.errors.email.message}</p> : null}
            </Field>

            <Field label="Mobile"><input {...addForm.register('mobile')} className={textInputClass()} /></Field>
            <Field label="Course"><input {...addForm.register('course_interest')} className={textInputClass()} /></Field>
            <Field label="City"><input {...addForm.register('city_interest')} className={textInputClass()} /></Field>
            <Field label="Budget"><input {...addForm.register('budget')} className={textInputClass()} /></Field>
            <Field label="Exam"><input {...addForm.register('exam_type')} className={textInputClass()} /></Field>

            <Field label="Status">
              <select {...addForm.register('status')} className={textInputClass()}>
                {LEAD_STATUSES.map((item) => (
                  <option key={item} value={item}>{statusText(item)}</option>
                ))}
              </select>
            </Field>

            <Field label="How did they contact?">
              <select {...addForm.register('contact_channel')} className={textInputClass()}>
                <option value="Phone Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Other">Other</option>
              </select>
            </Field>

            <Field label="Class 12 Stream"><input {...addForm.register('class12_stream')} className={textInputClass()} /></Field>
            <Field label="Class 12 %"><input {...addForm.register('class12_percentage')} className={textInputClass()} /></Field>
            <Field label="Source Page Slug"><input {...addForm.register('source_page_slug')} className={textInputClass()} /></Field>
            <Field label="Source Page Title"><input {...addForm.register('source_page_title')} className={textInputClass()} /></Field>
            <Field label="UTM Source"><input {...addForm.register('utm_source')} className={textInputClass()} /></Field>
            <Field label="UTM Medium"><input {...addForm.register('utm_medium')} className={textInputClass()} /></Field>
            <Field label="UTM Campaign"><input {...addForm.register('utm_campaign')} className={textInputClass()} /></Field>
          </div>

          <Field label="Message">
            <textarea {...addForm.register('message')} className="h-20 w-full rounded-md border border-[#dbe3f1] p-2 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20" />
          </Field>

          <Field label="Admin Notes">
            <textarea {...addForm.register('admin_notes')} className="h-24 w-full rounded-md border border-[#dbe3f1] p-2 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20" />
          </Field>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddModalOpen(false)} className="rounded-md border border-[#dbe3f1] px-3 py-2 text-sm text-[#334155] hover:bg-[#f8fafc]">
              Cancel
            </button>
            <button type="submit" disabled={addForm.formState.isSubmitting} className="rounded-md bg-[#4f46e5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-60">
              {addForm.formState.isSubmitting ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </ModalContainer>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this lead?"
        description={`This will permanently remove ${deleteTarget?.name || "this lead"}'s enquiry. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={deleteSingleLead}
      />

      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete selected leads?"
        description={`This will permanently remove ${selectedCount} selected enquiries. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={deleteSelectedLeads}
      />
    </div>
  )
}

export { exportLeadsToCsv }
