import type { College, Page } from '../../lib/types'

type FAQItem = {
  question?: string | null
  answer?: string | null
}

type AEOContentProps = {
  page: Page
  colleges: College[]
  faqs: FAQItem[]
}

const CURRENT_YEAR = new Date().getFullYear()

const COURSE_DURATION_YEARS: Record<string, number> = {
  mba: 2,
  btech: 4,
  mbbs: 5.5,
  bba: 3,
  bca: 3,
  bcom: 3,
  bsc: 3,
  ba: 3,
  barch: 5,
  bds: 5,
  bhm: 4,
  bpharm: 4,
  llb: 3,
  bed: 2,
  mca: 2,
  mtech: 2,
  mcom: 2,
  msc: 2,
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function toCourseKey(course: string): string {
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

function formatDate(input: string | null | undefined): string {
  const value = normalizeText(input)
  if (!value) return 'Recently updated'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently updated'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatMoneyInr(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function formatLpa(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'N/A'
  return `${value.toFixed(1)}`
}

function getCourse(page: Page): string {
  return normalizeText(page.course || page.content_json?.filters?.course || 'Course')
}

function getCity(page: Page): string {
  return normalizeText(page.city || page.content_json?.filters?.city || 'India')
}

function getFeeRange(page: Page): string {
  return normalizeText(page.fee_range || page.content_json?.filters?.fee_range || 'a moderate budget')
}

function getExamType(page: Page): string {
  return normalizeText(page.exam_type || page.content_json?.filters?.exam_type || 'major entrance exams')
}

function getDurationYears(page: Page, colleges: College[]): number {
  const durations = colleges
    .map((college) => toFiniteNumber(college.duration_years))
    .filter((duration): duration is number => duration !== null && duration > 0)

  if (durations.length > 0) {
    return Number(average(durations).toFixed(1))
  }

  const fallback = COURSE_DURATION_YEARS[toCourseKey(getCourse(page))]
  return fallback || 4
}

function getTopCollegeByType(colleges: College[], type: 'private' | 'govt'): College | null {
  const filtered = colleges.filter((college) => {
    const collegeType = normalizeText(college.type).toLowerCase()
    if (!collegeType) return false

    if (type === 'private') {
      return collegeType.includes('private')
    }

    return collegeType.includes('gov') || collegeType.includes('government')
  })

  if (filtered.length === 0) return null

  const ranked = [...filtered].sort((a, b) => {
    const aPlacement = toFiniteNumber(a.placement_percent) || 0
    const bPlacement = toFiniteNumber(b.placement_percent) || 0
    return bPlacement - aPlacement
  })

  return ranked[0] || null
}

function getAveragePlacement(colleges: College[]): number {
  const placements = colleges
    .map((college) => toFiniteNumber(college.placement_percent))
    .filter((value): value is number => value !== null && value > 0)

  if (placements.length === 0) return 0
  return Math.round(average(placements))
}

function getAveragePackage(colleges: College[]): number {
  const packages = colleges
    .map((college) => toFiniteNumber(college.avg_package_lpa))
    .filter((value): value is number => value !== null && value > 0)

  if (packages.length === 0) return 0
  return Number(average(packages).toFixed(1))
}

function extractFirstSentence(answer: string): string {
  const normalized = normalizeText(answer)
  if (!normalized) return ''

  const sentenceMatch = normalized.match(/.*?[.!?](?:\s|$)/)
  if (sentenceMatch) {
    return normalizeText(sentenceMatch[0])
  }

  return normalized
}

function normalizeWordRange(text: string, minWords: number, maxWords: number, filler: string): string {
  const words = normalizeText(text).split(' ').filter(Boolean)
  const fillerWords = normalizeText(filler).split(' ').filter(Boolean)

  while (words.length < minWords && fillerWords.length > 0) {
    words.push(fillerWords[(words.length - minWords + fillerWords.length) % fillerWords.length])
  }

  const trimmed = words.slice(0, maxWords)
  const sentence = trimmed.join(' ').replace(/\s+([.,!?;:])/g, '$1').trim()

  if (!sentence) return ''
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

function buildDirectAnswer(baseLead: string, sourceAnswer: string, contextualTail: string): string {
  const sentence = extractFirstSentence(sourceAnswer)
  const combined = `${normalizeText(baseLead)} ${sentence ? sentence : ''} ${normalizeText(contextualTail)}`

  return normalizeWordRange(
    combined,
    40,
    60,
    `Compare eligibility, category cutoff trends, and seat availability before final choice to improve admission chances for ${CURRENT_YEAR}.`
  )
}

function getTopNaacGrade(colleges: College[], fallbackCollege: College | null): string {
  const gradeFromFeatured = normalizeText(fallbackCollege?.naac_grade)
  if (gradeFromFeatured) return gradeFromFeatured

  const grade = colleges
    .map((college) => normalizeText(college.naac_grade))
    .find((value) => Boolean(value))

  return grade || 'Not specified'
}

function getCutoffHint(faqs: FAQItem[]): string {
  const secondAnswer = normalizeText(faqs[1]?.answer)
  const percent = secondAnswer.match(/\d{2}(?:\.\d+)?%/)
  if (percent?.[0]) return percent[0]
  return '60% to 85%'
}

function getQuickSummary(args: {
  course: string
  city: string
  feeRange: string
  examType: string
  privateCollege: College | null
  govtCollege: College | null
  averagePlacement: number
  averagePackage: number
}): string {
  const privateName = normalizeText(args.privateCollege?.name || 'leading private colleges')
  const govtName = normalizeText(args.govtCollege?.name || 'top government colleges')

  const privateFees = formatMoneyInr(toFiniteNumber(args.privateCollege?.fees_per_year))
  const govtFees = formatMoneyInr(toFiniteNumber(args.govtCollege?.fees_per_year))

  const privatePlacement = Math.round(toFiniteNumber(args.privateCollege?.placement_percent) || args.averagePlacement || 0)

  const packageText = formatLpa(args.averagePackage)

  return `Quick Answer: The best ${args.course} colleges in ${args.city} for ${args.feeRange} budget accepting ${args.examType} include ${privateName} (private, fees ${privateFees}/yr, placement ${privatePlacement}%), ${govtName} (government, fees ${govtFees}/yr, highly competitive). Average placement rate is ${args.averagePlacement}% with packages of ${packageText} LPA.`
}

export default function AEOContent({ page, colleges, faqs }: AEOContentProps) {
  const safeColleges = Array.isArray(colleges) ? colleges : []
  const safeFaqs = Array.isArray(faqs) ? faqs : []

  const course = getCourse(page)
  const city = getCity(page)
  const feeRange = getFeeRange(page)
  const examType = getExamType(page)

  const privateCollege = getTopCollegeByType(safeColleges, 'private') || safeColleges[0] || null
  const govtCollege = getTopCollegeByType(safeColleges, 'govt') || safeColleges[1] || safeColleges[0] || null

  const averagePlacement = getAveragePlacement(safeColleges)
  const averagePackage = getAveragePackage(safeColleges)
  const durationYears = getDurationYears(page, safeColleges)
  const updatedAtLabel = formatDate(page.updated_at || page.created_at)

  const quickSummary = getQuickSummary({
    course,
    city,
    feeRange,
    examType,
    privateCollege,
    govtCollege,
    averagePlacement,
    averagePackage,
  })

  const firstAnswer = buildDirectAnswer(
    `Yes, you can get ${course} admission in ${city} for ${feeRange} when your profile matches cutoff, seat availability, and exam criteria.`,
    normalizeText(safeFaqs[0]?.answer),
    `Shortlist both private and government options, then compare fees, placement support, and counseling timelines before final application submission.`
  )

  const secondAnswer = buildDirectAnswer(
    `Yes, the minimum Class 12th percentage for ${course} in ${city} usually starts around ${getCutoffHint(safeFaqs)} depending on college category and competition.`,
    normalizeText(safeFaqs[1]?.answer),
    'Top colleges generally require stronger academic scores, while mid-tier options provide more flexibility with merit and entrance rank combinations.'
  )

  const thirdAnswer = buildDirectAnswer(
    `Yes, ${examType} is commonly compulsory for competitive ${course} admissions in ${city}, especially in high-demand institutions with limited seats.`,
    normalizeText(safeFaqs[2]?.answer),
    'Some colleges may accept alternate exams or merit-based pathways, but entrance qualification significantly improves shortlist probability and counseling outcomes.'
  )

  return (
    <section aria-hidden="true" className="space-y-8">
      <div className="sr-only">
        <h2>Quick Answer Summary</h2>
        <p className="page-intro admission-summary">{quickSummary}</p>

        <h2>Key Facts</h2>
        <ul data-schema="keyFacts" className="key-facts">
          <li>Number of colleges listed: {safeColleges.length}</li>
          <li>Course: {course}</li>
          <li>City: {city}</li>
          <li>Fee range: {feeRange} per year</li>
          <li>Entrance exam: {examType}</li>
          <li>Average placement rate: {averagePlacement}%</li>
          <li>Average package: {formatLpa(averagePackage)} LPA</li>
          <li>Top private college: {normalizeText(privateCollege?.name || 'Not specified')}</li>
          <li>Top government college: {normalizeText(govtCollege?.name || 'Not specified')}</li>
          <li>NAAC grade of top college: {getTopNaacGrade(safeColleges, privateCollege)}</li>
          <li>Duration: {durationYears} years</li>
          <li>Last updated: {updatedAtLabel}</li>
        </ul>
      </div>

      <section className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-6 space-y-6">
        <h2 className="text-2xl font-bold text-[#000000]">Direct Answers for Students</h2>

        <article className="space-y-2">
          <h3 className="text-lg font-semibold text-[#000000]">
            Can I get {course} admission in {city} for {feeRange}?
          </h3>
          <p className="faq-answer text-[#333333] leading-relaxed">{firstAnswer}</p>
        </article>

        <article className="space-y-2">
          <h3 className="text-lg font-semibold text-[#000000]">
            What is the minimum Class 12th percentage for {course} in {city}?
          </h3>
          <p className="faq-answer text-[#333333] leading-relaxed">{secondAnswer}</p>
        </article>

        <article className="space-y-2">
          <h3 className="text-lg font-semibold text-[#000000]">
            Is {examType} compulsory for {course} in {city}?
          </h3>
          <p className="faq-answer admission-summary text-[#333333] leading-relaxed">{thirdAnswer}</p>
        </article>
      </section>

      <nav aria-label="Page contents" id="toc" className="rounded-xl border border-[#e5e5e5] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#000000] mb-3">Page Contents</h2>
        <ol className="list-decimal list-inside space-y-1 text-[#333333]">
          <li>
            <a href="#top-colleges" className="hover:text-[#14213d] underline-offset-2 hover:underline">
              Top {course} colleges in {city}
            </a>
          </li>
          <li>
            <a href="#comparison" className="hover:text-[#14213d] underline-offset-2 hover:underline">
              Compare colleges - fees and placement
            </a>
          </li>
          <li>
            <a href="#govt-vs-private" className="hover:text-[#14213d] underline-offset-2 hover:underline">
              Govt vs private colleges
            </a>
          </li>
          <li>
            <a href="#admission-process" className="hover:text-[#14213d] underline-offset-2 hover:underline">
              Admission process {CURRENT_YEAR}
            </a>
          </li>
          <li>
            <a href="#faqs" className="hover:text-[#14213d] underline-offset-2 hover:underline">
              Frequently asked questions
            </a>
          </li>
        </ol>
      </nav>
    </section>
  )
}
