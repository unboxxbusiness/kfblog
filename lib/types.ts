export type PageSummary = {
  id: string
  slug: string
  course?: string | null
  city?: string | null
  fee_range?: string | null
  exam_type?: string | null
  page_title?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ContentJson {
  seo?: {
    title?: string | null
    meta_description?: string | null
    meta_desc?: string | null
    h1?: string | null
    slug?: string | null
  }
  filters?: {
    course?: string | null
    city?: string | null
    fee_range?: string | null
    exam_type?: string | null
  }
  intro?: {
    paragraph?: string | null
    stats?: Array<{ label?: string | null; value?: string | number | null }>
  }
  colleges?: College[]
  comparison_table?: {
    caption?: string | null
    headers?: string[]
    rows?: Array<Record<string, string | number | null>>
  }
  private_vs_govt?: {
    heading?: string | null
    private_advantages?: string[]
    govt_advantages?: string[]
    verdict?: string | null
  }
  admission_process?: {
    heading?: string | null
    steps?: Array<{ step?: number; title?: string | null; description?: string | null }>
  }
  faqs?: Array<{ question?: string | null; answer?: string | null }>
  related_pages?: Array<{ title?: string | null; slug?: string | null }>
  cta?: {
    heading?: string | null
    subtext?: string | null
    button_text?: string | null
    button_url?: string | null
  }
  [key: string]: any
}

export interface College {
  name: string
  type?: 'private' | 'govt' | string | null
  city?: string | null
  fees_per_year?: number | null
  total_fees?: number | null
  duration_years?: number | null
  naac_grade?: string | null
  rating?: number | null
  placement_percent?: number | null
  avg_package_lpa?: number | null
  top_recruiters?: string[]
  value_score?: number | null
  difficulty_score?: number | null
  highlights?: string[]
  pros?: string[]
  cons?: string[]
  cutoff_class12?: string | null
  scholarship_available?: boolean | null
  hostel_available?: boolean | null
  apply_url?: string | null
  is_featured?: boolean | null
  [key: string]: any
}

export interface Page {
  id: string
  slug: string
  course?: string | null
  city?: string | null
  fee_range?: string | null
  exam_type?: string | null
  college_type?: string | null
  page_title?: string | null
  meta_desc?: string | null
  h1_text?: string | null
  content_json?: ContentJson | null
  published?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}
