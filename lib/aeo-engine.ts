import type { College, Page } from './types'
import { getCanonicalUrl } from './seo-engine'

type ComparisonTableInput = {
  caption?: string | null
  headers?: string[] | null
  course?: string | null
  city?: string | null
  canonicalUrl?: string | null
}

type CollegeWithContext = College & {
  course?: string | null
  city?: string | null
}

const COURSE_DESCRIPTIONS: Record<string, string> = {
  mba: 'Master of Business Administration (MBA) is a 2-year postgraduate management degree in India. It prepares students for leadership roles in business, finance, marketing, and operations.',
  btech: 'Bachelor of Technology (B.Tech) is a 4-year undergraduate engineering degree in India. Admission is primarily through JEE Main/Advanced or state-level entrance exams.',
  mbbs: 'Bachelor of Medicine and Bachelor of Surgery (MBBS) is a 5.5-year undergraduate medical degree in India. Admission requires NEET qualification with high percentile.',
  bba: 'Bachelor of Business Administration (BBA) is a 3-year undergraduate management program in India. It builds foundational skills in business, communication, and entrepreneurship.',
  bca: 'Bachelor of Computer Applications (BCA) is a 3-year undergraduate degree focused on software, programming, and IT systems. Admission is usually merit-based or through institute-level entrance tests.',
  bcom: 'Bachelor of Commerce (B.Com) is a 3-year undergraduate degree covering accounting, finance, taxation, and business law. It is one of the most common pathways to careers in banking and commerce.',
  bsc: 'Bachelor of Science (B.Sc) is a 3-year undergraduate degree in science disciplines like physics, chemistry, biology, and mathematics. Admission is typically merit-based, with entrance exams in some universities.',
  ba: 'Bachelor of Arts (B.A.) is a 3-year undergraduate degree across humanities, social sciences, and liberal arts subjects. It develops analytical, communication, and research skills for diverse careers.',
  barch: 'Bachelor of Architecture (B.Arch) is a 5-year professional undergraduate degree in architecture and design. Admission generally requires NATA or JEE Paper 2 qualification.',
  bds: 'Bachelor of Dental Surgery (BDS) is a 5-year undergraduate dental degree in India, including internship. Admission is based on NEET scores and centralized counseling.',
  bhm: 'Bachelor of Hotel Management (BHM) is a 3 to 4-year undergraduate degree in hospitality and hotel operations. It prepares students for careers in hotels, tourism, and service management.',
  bpharm: 'Bachelor of Pharmacy (B.Pharm) is a 4-year undergraduate degree in pharmaceutical sciences. Admission is based on merit or pharmacy entrance tests depending on state and institute.',
  llb: 'Bachelor of Laws (LLB) is a professional law degree in India offered as a 3-year or integrated 5-year program. Admission is commonly through CLAT or university-level law entrance exams.',
  bed: 'Bachelor of Education (B.Ed) is a 2-year professional degree for teaching careers in schools. Admission is usually based on graduation marks and B.Ed entrance examinations.',
  mca: 'Master of Computer Applications (MCA) is a postgraduate degree focused on advanced computing and software development. Admission is typically through state or university entrance exams after graduation.',
  mtech: 'Master of Technology (M.Tech) is a 2-year postgraduate engineering degree for technical specialization. Admission is primarily through GATE scores and institute-level criteria.',
  mcom: 'Master of Commerce (M.Com) is a postgraduate degree in finance, accounting, economics, and business studies. It supports advanced careers in academics, banking, taxation, and corporate finance.',
  msc: 'Master of Science (M.Sc) is a postgraduate degree in specialized science subjects. Admission generally depends on graduation performance and entrance tests by universities.',
  bpt: 'Bachelor of Physiotherapy (BPT) is a 4.5-year undergraduate allied health degree focused on physical rehabilitation and therapy. Admission is merit-based or through state-level medical allied entrance exams.',
  bams: 'Bachelor of Ayurvedic Medicine and Surgery (BAMS) is a 5.5-year undergraduate degree in Ayurvedic medicine in India. Admission requires NEET qualification in most states.',
  bums: 'Bachelor of Unani Medicine and Surgery (BUMS) is a 5.5-year undergraduate degree in Unani medical education in India. Admission is generally through NEET and state counseling processes.',
}

const DEFAULT_COURSE_DESCRIPTION =
  'This course is a recognized higher education program in India for Class 12th students and graduates. It provides structured academic training, practical exposure, and career pathways based on admission criteria, fees, and entrance exam requirements.'

const GRADE_TO_RATING: Record<string, number> = {
  'A++': 4.9,
  'A+': 4.6,
  A: 4.3,
  'B++': 4.0,
  'B+': 3.7,
  B: 3.4,
  'C++': 3.1,
  'C+': 2.8,
  C: 2.5,
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeCourseKey(course: string): string {
  return normalizeText(course)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]): number {
  if (!values.length) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

function ratingFromCollege(college: CollegeWithContext): number | null {
  const directRating = toFiniteNumber(college.rating)
  if (directRating !== null && directRating >= 1 && directRating <= 5) {
    return Number(directRating.toFixed(1))
  }

  const valueScore = toFiniteNumber((college as Record<string, unknown>).value_score)
  if (valueScore !== null && valueScore > 0) {
    const normalized = valueScore > 5 ? valueScore / 2 : valueScore
    if (normalized >= 1 && normalized <= 5) {
      return Number(normalized.toFixed(1))
    }
  }

  const gradeRaw = normalizeText(college.naac_grade).toUpperCase()
  if (GRADE_TO_RATING[gradeRaw]) {
    return GRADE_TO_RATING[gradeRaw]
  }

  return null
}

function inferCourse(colleges: CollegeWithContext[]): string {
  const first = colleges.find((college) => normalizeText(college.course))
  return normalizeText(first?.course || 'College')
}

function inferCity(colleges: CollegeWithContext[]): string {
  const first = colleges.find((college) => normalizeText(college.city))
  return normalizeText(first?.city || 'India')
}

function resolveCanonicalUrl(inputCanonical: string | null | undefined, course: string, city: string): string {
  const normalizedCanonical = normalizeText(inputCanonical)
  if (/^https?:\/\//i.test(normalizedCanonical)) {
    return normalizedCanonical
  }

  if (!course || !city) {
    return getCanonicalUrl('', 'static')
  }

  return getCanonicalUrl(`${course}-colleges-${city}`, 'college')
}

export function getCourseDescription(course: string): string {
  const key = normalizeCourseKey(course)
  return COURSE_DESCRIPTIONS[key] || DEFAULT_COURSE_DESCRIPTION
}

export function generateSpeakableMarkup(page: Page): Record<string, unknown> {
  const canonicalUrl = getCanonicalUrl(page.slug || '', 'college')

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: [
        'h1',
        '.page-intro',
        '.stats-bar',
        '.featured-college-name',
        '.key-facts',
        '.verdict-text',
        '.faq-answer',
        '.admission-summary',
      ],
    },
    url: canonicalUrl,
  }
}

export function generateDefinedTermsMarkup(course: string): Record<string, unknown> {
  const normalizedCourse = normalizeText(course)

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: normalizedCourse,
    description: getCourseDescription(normalizedCourse),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Indian Higher Education Courses',
      url: 'https://kampusfilter.com/courses',
    },
  }
}

export function generateTableMarkup(comparisonTable: ComparisonTableInput): Record<string, unknown> {
  const course = normalizeText(comparisonTable.course || 'college')
  const city = normalizeText(comparisonTable.city || 'India')
  const canonicalUrl = resolveCanonicalUrl(comparisonTable.canonicalUrl, course, city)

  const headers = Array.isArray(comparisonTable.headers)
    ? comparisonTable.headers.map((header) => normalizeText(header)).filter(Boolean)
    : []

  const caption = normalizeText(comparisonTable.caption || `Compare ${course} colleges in ${city}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: caption,
    description: `Comparison of ${course} colleges in ${city} - fees, placement, NAAC grade and Class 12th cutoffs`,
    url: `${canonicalUrl}#comparison-table`,
    keywords: [course, city, 'fees', 'placement', 'comparison'].filter(Boolean),
    creator: {
      '@type': 'Organization',
      name: 'Kampus Filter',
    },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/html',
      contentUrl: `${canonicalUrl}#comparison-table`,
    },
    variableMeasured: headers.map((header) => ({
      '@type': 'PropertyValue',
      name: header,
    })),
  }
}

export function generateReviewAggregateMarkup(collegesInput: CollegeWithContext[]): Record<string, unknown> {
  const colleges = Array.isArray(collegesInput) ? collegesInput : []
  const ratings = colleges
    .map((college) => ratingFromCollege(college))
    .filter((rating): rating is number => rating !== null)

  const ratingValue = ratings.length > 0 ? Number(average(ratings).toFixed(1)) : 4.1
  const course = inferCourse(colleges)
  const city = inferCity(colleges)

  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue,
    reviewCount: colleges.length,
    bestRating: 5,
    worstRating: 1,
    itemReviewed: {
      '@type': 'EducationalOrganization',
      name: `Top ${course} Colleges in ${city}`,
    },
  }
}
