import type { Metadata } from 'next'
import type { College, Page } from './types'

const DEFAULT_BASE_URL = 'https://kampusfilter.com'
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_YEAR_REGEX = new RegExp(`\\b${CURRENT_YEAR}\\b`)
const DEFAULT_SITE_TITLE = `Kampus Filter — Find Your Dream College in India ${CURRENT_YEAR}`
const TITLE_TEMPLATE = '%s | Kampus Filter'

const BASE_URL = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_BASE_URL)
  .trim()
  .replace(/\/$/, '')

const SOCIALS = {
  twitter: '@KampusFilter',
  sameAs: [
    'https://twitter.com/KampusFilter',
    'https://instagram.com/kampusfilter',
    'https://linkedin.com/company/kampusfilter',
    'https://youtube.com/@kampusfilter',
  ],
}

type HubType = 'course' | 'city'

type HubStats = {
  minFee?: number | null
  maxFee?: number | null
  examTypesCount?: number | null
  cityCount?: number | null
  courseCount?: number | null
}

type ApplyMetaInput = {
  course?: string | null
  city?: string | null
}

type AnyPage = Page & {
  updated_at?: string | null
}

function toTitleCase(value: string): string {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeWhitespace(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function smartTruncate(value: string, max: number): string {
  const clean = normalizeWhitespace(value)
  if (clean.length <= max) return clean

  const slice = clean.slice(0, max + 1)
  const hardBreaks = [' | ', ' - ', ': ']

  for (const marker of hardBreaks) {
    const idx = slice.lastIndexOf(marker)
    if (idx > Math.floor(max * 0.55)) {
      return slice.slice(0, idx).trim()
    }
  }

  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > Math.floor(max * 0.55)) {
    return slice.slice(0, lastSpace).trim()
  }

  return clean.slice(0, max).trim()
}

function smartTruncateDescription(value: string, max: number): string {
  const clean = normalizeWhitespace(value)
  if (clean.length <= max) return clean

  const slice = clean.slice(0, max + 1)
  const lastSentence = slice.lastIndexOf('. ')
  if (lastSentence > Math.floor(max * 0.5)) {
    return slice.slice(0, lastSentence + 1).trim()
  }

  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > Math.floor(max * 0.65)) {
    return `${slice.slice(0, lastSpace).trim()}...`
  }

  return `${clean.slice(0, max - 3).trim()}...`
}

function parseFeeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value || '').match(/\d[\d,]*/)
  if (!match) return null
  const n = Number(match[0].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function formatFeeRange(value: string | null | undefined): string {
  const raw = normalizeWhitespace(String(value || ''))
  if (!raw) return 'affordable'
  return raw
}

function getColleges(page: AnyPage): College[] {
  const rows = page.content_json?.colleges
  return Array.isArray(rows) ? rows : []
}

function avgPlacement(colleges: College[]): number {
  const nums = colleges
    .map((c) => Number(c.placement_percent))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!nums.length) return 78
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length)
}

function avgPackage(colleges: College[]): number {
  const nums = colleges
    .map((c) => Number(c.avg_package_lpa))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!nums.length) return 6.5
  const value = nums.reduce((sum, n) => sum + n, 0) / nums.length
  return Number(value.toFixed(1))
}

function getCourse(page: AnyPage): string {
  return normalizeWhitespace(String(page.course || page.content_json?.filters?.course || 'College'))
}

function getCity(page: AnyPage): string {
  return normalizeWhitespace(String(page.city || page.content_json?.filters?.city || 'India'))
}

function getFeeRange(page: AnyPage): string {
  return formatFeeRange(String(page.fee_range || page.content_json?.filters?.fee_range || 'low to mid'))
}

function getExamType(page: AnyPage): string {
  return normalizeWhitespace(String(page.exam_type || page.content_json?.filters?.exam_type || 'major entrance exams'))
}

function getPublishedISO(page: AnyPage): string {
  return page.created_at ? new Date(page.created_at).toISOString() : new Date().toISOString()
}

function getModifiedISO(page: AnyPage): string {
  return page.updated_at ? new Date(page.updated_at).toISOString() : getPublishedISO(page)
}

function getSeoHeadline(page: AnyPage): string {
  return normalizeWhitespace(
    String(
      page.content_json?.seo?.title ||
        page.page_title ||
        page.h1_text ||
        `${getCourse(page)} Colleges in ${getCity(page)}`
    )
  )
}

function rankKeywordByVolume(keyword: string): number {
  const text = keyword.toLowerCase()
  const words = text.split(' ').filter(Boolean)
  let score = words.length

  if (/\b(best|top|admission|fees|placement|cutoff|review)\b/.test(text)) score += 0.8
  if (/\bwhich|how|what\b/.test(text)) score += 1.2
  if (CURRENT_YEAR_REGEX.test(text)) score += 0.3
  if (/\bclass 12th\b/.test(text)) score += 0.6

  return score
}

export function getCanonicalUrl(slug: string, type: 'college' | 'course' | 'city' | 'apply' | 'static'): string {
  const base = BASE_URL
  const safeSlug = slugify(slug)

  let path = '/'
  if (type === 'college') path = `/colleges/${safeSlug}`
  if (type === 'course') path = `/courses/${safeSlug}`
  if (type === 'city') path = `/cities/${safeSlug}`
  if (type === 'apply') path = '/apply'
  if (type === 'static') {
    const clean = String(slug || '')
      .trim()
      .toLowerCase()
      .replace(/\/+$/, '')
      .replace(/^\/*/, '/')
    path = clean || '/'
  }

  const normalized = path === '/' ? path : path.replace(/\/+$/, '')
  return `${base}${normalized}`
}

export function generateKeywords(page: AnyPage): string[] {
  const colleges = getColleges(page)
  const course = getCourse(page).toLowerCase()
  const city = getCity(page).toLowerCase()
  const feeRange = getFeeRange(page).toLowerCase()
  const examType = getExamType(page).toLowerCase()

  const raw = new Set<string>()

  const baseTerms = [course, city, feeRange, examType]
  baseTerms.forEach((t) => raw.add(t))

  raw.add(`${course} colleges in ${city}`)
  raw.add(`${course} admission ${city} ${CURRENT_YEAR}`)
  raw.add(`${course} fees ${city}`)
  raw.add(`${examType} ${course} ${city}`)
  raw.add(`best ${course} college ${city}`)
  raw.add(`${feeRange} ${course} ${city}`)
  raw.add(`${city} ${course} placement`)
  raw.add(`${course} ${city} cutoff`)
  raw.add(`class 12th ${course} ${city}`)
  raw.add(`best ${course} colleges in ${city} for ${feeRange} budget`)
  raw.add(`which ${course} college in ${city} accepts ${examType}`)
  raw.add(`${course} colleges ${city} ${CURRENT_YEAR}`)
  raw.add(`${city} ${course} admissions ${CURRENT_YEAR}`)
  raw.add(`${course} colleges near ${city}`)
  raw.add(`${examType} accepted colleges in ${city}`)
  raw.add(`${course} colleges with placement in ${city}`)
  raw.add(`top ${course} institutes ${city}`)
  raw.add(`${course} counselling ${city}`)
  raw.add(`${course} colleges under ${feeRange} in ${city}`)

  for (let i = 0; i < baseTerms.length; i += 1) {
    for (let j = i + 1; j < baseTerms.length; j += 1) {
      raw.add(`${baseTerms[i]} ${baseTerms[j]}`)
      raw.add(`${baseTerms[j]} ${baseTerms[i]}`)
    }
  }

  for (let i = 0; i < baseTerms.length; i += 1) {
    for (let j = i + 1; j < baseTerms.length; j += 1) {
      for (let k = j + 1; k < baseTerms.length; k += 1) {
        raw.add(`${baseTerms[i]} ${baseTerms[j]} ${baseTerms[k]}`)
      }
    }
  }

  colleges.forEach((college) => {
    const name = normalizeWhitespace(String(college.name || '')).toLowerCase()
    if (!name) return

    raw.add(`${name} admission`)
    raw.add(`${name} fees`)
    raw.add(`${name} review`)

    const type = String(college.type || '').toLowerCase()
    if (type.includes('private')) raw.add(`${name} private college admission`)
    if (type.includes('gov') || type.includes('government')) raw.add(`${name} govt college admission`)
  })

  const withYear = Array.from(raw).map((kw) => `${kw} ${CURRENT_YEAR}`)
  withYear.forEach((kw) => raw.add(kw))

  const deduped = Array.from(raw)
    .map((kw) => normalizeWhitespace(kw))
    .filter((kw) => kw.length >= 3)

  deduped.sort((a, b) => rankKeywordByVolume(a) - rankKeywordByVolume(b))

  return Array.from(new Set(deduped)).slice(0, 40)
}

export function generateMetadata(page: AnyPage): Metadata {
  const course = getCourse(page)
  const city = getCity(page)
  const feeRange = getFeeRange(page)
  const examType = getExamType(page)
  const colleges = getColleges(page)

  const placement = avgPlacement(colleges)
  const avgPkg = avgPackage(colleges)
  const collegesCount = Math.max(1, colleges.length)

  const rawTitle = `${course} Colleges in ${city} | ${feeRange} | ${examType} ${CURRENT_YEAR} | Kampus Filter`
  const title = smartTruncate(rawTitle, 60)

  const rawDescription = `Find best ${course} colleges in ${city} for ${feeRange} budget accepting ${examType}. Compare ${collegesCount} colleges — fees, placement ${placement}%, avg package ${avgPkg} LPA. Free counselling for Class 12th students ${CURRENT_YEAR}.`
  const description = smartTruncateDescription(rawDescription, 155)

  const canonical = getCanonicalUrl(page.slug || '', 'college')
  const keywords = generateKeywords(page)
  const publishedISO = getPublishedISO(page)
  const modifiedISO = getModifiedISO(page)

  return {
    title: {
      default: DEFAULT_SITE_TITLE,
      template: TITLE_TEMPLATE,
      absolute: title,
    },
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'Kampus Filter',
      locale: 'en_IN',
      images: [
        {
          url: `${BASE_URL}/api/og/${encodeURIComponent(String(page.slug || 'home').toLowerCase())}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/api/og/${encodeURIComponent(String(page.slug || 'home').toLowerCase())}`],
      site: SOCIALS.twitter,
      creator: SOCIALS.twitter,
    },
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'article:published_time': publishedISO,
      'article:modified_time': modifiedISO,
      'article:section': course,
      'article:tag': [course, city, examType, feeRange],
      'geo.region': 'IN',
      'geo.placename': city,
      'content-language': 'en-IN',
      'DC.title': getSeoHeadline(page),
      'DC.description': normalizeWhitespace(String(page.meta_desc || description)),
      'DC.subject': course,
      'DC.coverage': city,
    },
  }
}

export function generateAllSchemas(
  page: AnyPage,
  collegesInput?: College[] | null,
  faqsInput?: Array<{ question?: string | null; answer?: string | null }> | null
): string[] {
  const course = getCourse(page)
  const city = getCity(page)
  const canonicalUrl = getCanonicalUrl(page.slug || '', 'college')
  const pageTitle = getSeoHeadline(page)
  const metaDescription = normalizeWhitespace(String(page.meta_desc || page.content_json?.seo?.meta_desc || ''))
  const publishedISO = getPublishedISO(page)
  const modifiedISO = getModifiedISO(page)

  const colleges = Array.isArray(collegesInput)
    ? collegesInput
    : Array.isArray(page.content_json?.colleges)
      ? page.content_json?.colleges
      : []

  const faqs = Array.isArray(faqsInput)
    ? faqsInput
    : Array.isArray(page.content_json?.faqs)
      ? page.content_json?.faqs
      : []

  const introParagraph = normalizeWhitespace(String(page.content_json?.intro?.paragraph || metaDescription || pageTitle))
  const admissionSteps = Array.isArray(page.content_json?.admission_process?.steps)
    ? page.content_json?.admission_process?.steps
    : []

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: pageTitle,
    description: metaDescription,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
    datePublished: publishedISO,
    dateModified: modifiedISO,
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'ReadAction',
      target: canonicalUrl,
    },
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
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Courses',
        item: `${BASE_URL}/courses`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: course,
        item: `${BASE_URL}/courses/${slugify(course)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: city,
        item: `${BASE_URL}/cities/${slugify(city)}`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: pageTitle,
        item: canonicalUrl,
      },
    ],
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${course} Colleges in ${city}`,
    description: metaDescription,
    numberOfItems: colleges.length,
    itemListElement: colleges.map((college, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'EducationalOrganization',
        '@id': String(college.apply_url || `${canonicalUrl}#college-${index + 1}`),
        name: college.name,
        description: Array.isArray(college.highlights) && college.highlights.length > 0 ? college.highlights.join('. ') : undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: city,
          addressCountry: 'IN',
        },
        url: String(college.apply_url || canonicalUrl),
        foundingDate: college.established ? String(college.established) : undefined,
        accreditation: college.naac_grade || undefined,
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: course,
        },
      },
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs
      .filter((faq) => faq?.question && faq?.answer)
      .map((faq) => ({
        '@type': 'Question',
        name: String(faq.question),
        acceptedAnswer: {
          '@type': 'Answer',
          text: String(faq.answer),
        },
      })),
  }

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${course} in ${city}`,
    description: introParagraph,
    provider: {
      '@type': 'Organization',
      name: 'Kampus Filter',
      url: BASE_URL,
    },
    educationalLevel: 'Higher Education',
    courseMode: 'full-time',
    hasCourseInstance: colleges.map((college) => ({
      '@type': 'CourseInstance',
      name: college.name,
      courseMode: 'Oncampus',
      location: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: city,
          addressCountry: 'IN',
        },
      },
      offers: {
        '@type': 'Offer',
        price: parseFeeNumber(college.fees_per_year) ?? parseFeeNumber((college as any).fees),
        priceCurrency: 'INR',
      },
    })),
  }

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Get ${course} Admission in ${city} ${CURRENT_YEAR}`,
    description: 'Step by step guide for Class 12th students',
    step: admissionSteps.map((step, index) => ({
      '@type': 'HowToStep',
      position: Number(step.step) || index + 1,
      name: String(step.title || `Step ${index + 1}`),
      text: String(step.description || ''),
    })),
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Kampus Filter',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/brand/logo-kampus-filter.webp`,
      width: 200,
      height: 60,
    },
    sameAs: SOCIALS.sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-9000000000',
      availableLanguage: ['English', 'Hindi'],
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Kampus Filter',
    description: "India's largest college discovery platform",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-IN',
  }

  const schemas: Record<string, any>[] = [
    webPageSchema,
    breadcrumbSchema,
    itemListSchema,
    courseSchema,
    howToSchema,
    organizationSchema,
  ]

  if (faqSchema.mainEntity.length > 0) schemas.push(faqSchema)

  const slug = String(page.slug || '').toLowerCase()
  const includeWebsite = slug === '' || slug === '/' || slug === 'home' || slug === 'index'
  if (includeWebsite) schemas.push(websiteSchema)

  return schemas.map((schema) => JSON.stringify(schema))
}

export function generateHubMetadata(
  type: HubType,
  value: string,
  count: number,
  stats: HubStats = {}
): Metadata {
  const normalizedValue = toTitleCase(value)
  const minFee = Number.isFinite(Number(stats.minFee)) ? Number(stats.minFee) : 0
  const maxFee = Number.isFinite(Number(stats.maxFee)) ? Number(stats.maxFee) : 0
  const examTypesCount = Number.isFinite(Number(stats.examTypesCount)) ? Number(stats.examTypesCount) : 0
  const cityCount = Number.isFinite(Number(stats.cityCount)) ? Number(stats.cityCount) : 0
  const courseCount = Number.isFinite(Number(stats.courseCount)) ? Number(stats.courseCount) : 0

  let rawTitle = ''
  let rawDescription = ''
  let canonical = ''

  if (type === 'course') {
    rawTitle = `Best ${normalizedValue} Colleges in India ${CURRENT_YEAR} | Fees, Placement & Cutoffs | Kampus Filter`
    rawDescription = `Compare ${normalizedValue} colleges across ${Math.max(cityCount, 1)} cities. Fees from ₹${Math.max(minFee, 0).toLocaleString()} to ₹${Math.max(maxFee, minFee).toLocaleString()}/yr. ${Math.max(examTypesCount, 1)} exam types accepted. Real placement data for Class 12th students. Updated ${CURRENT_YEAR}.`
    canonical = getCanonicalUrl(normalizedValue, 'course')
  } else {
    rawTitle = `Best Colleges in ${normalizedValue} ${CURRENT_YEAR} | All Courses, Fees & Admissions | Kampus Filter`
    rawDescription = `Find top colleges in ${normalizedValue} for ${Math.max(courseCount, 1)} courses. Compare fees from ₹${Math.max(minFee, 0).toLocaleString()}/yr, placement stats & Class 12th cutoffs. Free counselling available.`
    canonical = getCanonicalUrl(normalizedValue, 'city')
  }

  const title = smartTruncate(rawTitle, 60)
  const description = smartTruncateDescription(rawDescription, 155)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'Kampus Filter',
      locale: 'en_IN',
      images: [
        {
          url: `${BASE_URL}/og-default.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/og-default.png`],
      site: SOCIALS.twitter,
      creator: SOCIALS.twitter,
    },
    keywords: [
      `${normalizedValue} colleges`,
      `${normalizedValue} admissions ${CURRENT_YEAR}`,
      `${normalizedValue} fees`,
      `${normalizedValue} placements`,
      `${normalizedValue} cutoff`,
      `best ${normalizedValue} colleges`,
      `${normalizedValue} counselling`,
      `class 12th ${normalizedValue}`,
      ...Array.from({ length: Math.min(5, Math.max(0, count)) }).map((_, idx) => `${normalizedValue} college list ${idx + 1}`),
    ],
    robots: {
      index: true,
      follow: true,
    },
  }
}

export function generateApplyPageMetadata(course?: string | null, city?: string | null): Metadata {
  const input: ApplyMetaInput = { course, city }
  const hasTarget = normalizeWhitespace(String(input.course || '')) && normalizeWhitespace(String(input.city || ''))

  const title = hasTarget
    ? smartTruncate(`Apply for ${toTitleCase(String(input.course))} in ${toTitleCase(String(input.city))} — Free Counselling ${CURRENT_YEAR} | Kampus Filter`, 60)
    : smartTruncate('Apply for College Admission — Free Expert Counselling | Kampus Filter', 60)

  const description = hasTarget
    ? smartTruncateDescription(
        `Apply for ${toTitleCase(String(input.course))} admission in ${toTitleCase(String(input.city))}. Get free expert counselling, eligibility support, and admission guidance for ${CURRENT_YEAR}.`,
        155
      )
    : smartTruncateDescription(
        `Apply for college admission with free expert counselling. Get personalized guidance on eligibility, fees, scholarships, and ${CURRENT_YEAR} admission timelines.`,
        155
      )

  return {
    title,
    description,
    alternates: {
      canonical: getCanonicalUrl('', 'apply'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      title,
      description,
      url: getCanonicalUrl('', 'apply'),
      type: 'website',
      siteName: 'Kampus Filter',
      locale: 'en_IN',
      images: [
        {
          url: `${BASE_URL}/og-default.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/og-default.png`],
      site: SOCIALS.twitter,
      creator: SOCIALS.twitter,
    },
  }
}
