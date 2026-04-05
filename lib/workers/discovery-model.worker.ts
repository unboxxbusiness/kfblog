type WorkerInputPage = {
  slug?: string
  page_title?: string | null
  h1_text?: string | null
  city?: string | null
  course?: string | null
  fee_range?: string | null
  exam_type?: string | null
  college_type?: string | null
}

type DiscoveryModel = {
  slug: string
  title: string
  city: string
  course: string
  fees: string
  exam: string
  placement: number
  avgPackage: number
  admissionChance: number
  matchScore: number
  tags: string[]
}

type WorkerMessage = {
  requestId: string
  pages: WorkerInputPage[]
}

type WorkerResponse = {
  requestId: string
  cards: DiscoveryModel[]
}

function hashText(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toDiscoveryModel(page: WorkerInputPage, index: number): DiscoveryModel {
  const slug = String(page.slug || `college-${index}`)
  const seed = hashText(slug)

  const placement = clamp(68 + (seed % 29), 65, 98)
  const avgPackage = Number((3.5 + ((seed >> 3) % 95) / 10).toFixed(1))
  const admissionChance = clamp(52 + ((seed >> 6) % 41), 40, 95)
  const matchScore = clamp(70 + ((seed >> 9) % 29), 65, 98)

  const title =
    String(page.page_title || page.h1_text || slug)
      .replace(/-/g, ' ')
      .trim() || 'College Profile'

  const tags = new Set<string>()
  const type = String(page.college_type || '').toLowerCase()
  if (type.includes('gov')) tags.add('Government')
  if (type.includes('private')) tags.add('Private')
  if (placement >= 88) tags.add('Top Placement')

  return {
    slug,
    title,
    city: String(page.city || 'Pan India'),
    course: String(page.course || 'General Stream'),
    fees: String(page.fee_range || 'Talk to counselor'),
    exam: String(page.exam_type || 'No mandatory exam'),
    placement,
    avgPackage,
    admissionChance,
    matchScore,
    tags: Array.from(tags),
  }
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const payload = event.data
  const cards = (payload.pages || []).map((page, index) => toDiscoveryModel(page, index))

  const response: WorkerResponse = {
    requestId: payload.requestId,
    cards,
  }

  self.postMessage(response)
}
