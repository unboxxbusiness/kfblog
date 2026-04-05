export type PageRow = {
  slug: string
  course?: string
  city?: string
  fee_range?: string
  exam_type?: string
  page_title?: string
  meta_desc?: string
  h1_text?: string
  content_json?: ContentJson
  published?: boolean
}

export type ContentJson = {
  seo?: {
    title?: string
    meta_desc?: string
    og_image?: string
    image?: string
  }
  target_student?: string
  filters?: {
    course?: string
    city?: string
    fee_range?: string
    exam_type?: string
  }
  intro?: {
    paragraph?: string
    stats?: Array<{ label: string; value: string | number }>
  }
  colleges?: College[]
  comparison_table?: {
    headers?: string[]
    rows?: Array<Record<string, string | number | null>>
  }
  private_vs_govt?: {
    pros?: string[]
    verdict?: string
  }
  admission_process?: {
    steps?: Array<{ title: string; description?: string }>
  }
  faqs?: Array<{ question: string; answer: string }>
  related_pages?: Array<{ title?: string; slug?: string }>
  content_meta?: Record<string, any>
  cta?: {
    heading?: string
    button_text?: string
    button_url?: string
  }
}

export type College = {
  name: string
  slug?: string
  type?: 'private' | 'govt' | string
  rating?: number
  fees_per_year?: string | number
  avg_package_lpa?: number
  placement_percent?: number
  highlights?: string[]
  pros?: string[]
  cons?: string[]
  is_featured?: boolean
  cta_url?: string
}
