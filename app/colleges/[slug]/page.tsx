import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPageBySlug, getAllPages, getAllPublishedPagesDetailed } from '../../../lib/api'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import CollegeCardsSection from './CollegeCardsSection'
import TrackRecentlyViewed from '../../../components/TrackRecentlyViewed'
import SchemaMarkup from '../../../components/seo/SchemaMarkup'
import AEOContent from '../../../components/seo/AEOContent'
import Breadcrumb from '../../../components/seo/Breadcrumb'
import InternalLinks from '../../../components/seo/InternalLinks'
import { isInternalHref, normalizeCtaHref } from '../../../lib/cta-link'
import {
  generateMetadata as generateSeoMetadata,
  generateAllSchemas,
  getCanonicalUrl,
} from '../../../lib/seo-engine'
import {
  generateDefinedTermsMarkup,
  generateReviewAggregateMarkup,
  generateSpeakableMarkup,
  generateTableMarkup,
} from '../../../lib/aeo-engine'

// ISR
export const revalidate = 3600

type RouteParams = { slug: string }

async function resolveParams(params: RouteParams | Promise<RouteParams>) {
  return Promise.resolve(params)
}

export async function generateStaticParams() {
  try {
    const pages = await getAllPages()
    return pages.map((p) => ({ slug: p.slug }))
  } catch (e) {
    return []
  }
}

export async function generateMetadata({ params }: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await resolveParams(params)
  const page = await getPageBySlug(resolved?.slug || '')
  if (!page) {
    return {
      title: 'Not Found',
      robots: { index: false, follow: false },
    }
  }

  const baseMetadata = generateSeoMetadata(page)
  const reviewedAt = page.updated_at ? new Date(page.updated_at).toISOString() : page.created_at ? new Date(page.created_at).toISOString() : new Date().toISOString()
  const baseOther = (baseMetadata.other || {}) as Record<string, string | number | Array<string | number>>

  return {
    ...baseMetadata,
    other: {
      ...baseOther,
      'last-reviewed': reviewedAt,
      'review-date': reviewedAt,
      'content-quality': 'expert-reviewed',
    },
  }
}

export default async function CollegePage({ params }: { params: { slug: string } }) {
  const resolved = await resolveParams(params)
  const slug = resolved?.slug || ''

  const page = await getPageBySlug(slug)
  if (!page) notFound()

  const content = page.content_json || {}
  const seo = content.seo || {}
  const colleges = Array.isArray(content.colleges) ? content.colleges : []
  const faqs = Array.isArray(content.faqs) ? content.faqs : []
  const canonicalUrl = getCanonicalUrl(page.slug || slug, 'college')

  const schemas = generateAllSchemas(
    page,
    colleges,
    faqs
  )
  const ctaButtonText = content.cta?.button_text || 'Talk to an Expert Now'
  const shouldRouteCtaToApply = /apply\s*now/i.test(ctaButtonText)
  const applyCtaSearch = new URLSearchParams()

  if (page.course) applyCtaSearch.set('course', String(page.course))
  if (slug) applyCtaSearch.set('source_page_slug', String(slug))
  if (page.page_title || page.h1_text) {
    applyCtaSearch.set('source_page_title', String(page.page_title || page.h1_text || ''))
  }

  const applyCtaHref = applyCtaSearch.toString() ? `/apply?${applyCtaSearch.toString()}` : '/apply'
  const rawCtaHref = shouldRouteCtaToApply ? applyCtaHref : content.cta?.button_url || (content.cta as any)?.url
  const ctaHref = normalizeCtaHref(rawCtaHref, applyCtaHref)
  const isInternalCtaHref = isInternalHref(ctaHref)
  const ctaButtonClassName = 'inline-flex items-center justify-center rounded-md bg-white px-8 py-4 text-lg font-bold text-[#14213d] shadow-xl transition-transform hover:scale-105 hover:bg-[#f5f5f5] focus:outline-none'

  const comparisonRows = Array.isArray(content.comparison_table)
    ? content.comparison_table
    : Array.isArray(content.comparison_table?.rows)
      ? content.comparison_table.rows
      : []
  const comparisonHeaders = comparisonRows.length
    ? Object.keys(comparisonRows[0])
    : Array.isArray(content.comparison_table?.headers)
      ? content.comparison_table.headers
      : []
  const comparisonCaption = typeof content.comparison_table?.caption === 'string'
    ? content.comparison_table.caption
    : `Comparison of ${page.course || 'college'} colleges in ${page.city || 'India'}`

  const aeoSchemas = [
    generateSpeakableMarkup(page),
    page.course ? generateDefinedTermsMarkup(String(page.course)) : null,
    comparisonHeaders.length > 0
      ? generateTableMarkup({
          caption: comparisonCaption,
          headers: comparisonHeaders,
          course: String(page.course || ''),
          city: String(page.city || ''),
          canonicalUrl,
        })
      : null,
    generateReviewAggregateMarkup(
      colleges.map((college: any) => ({
        ...college,
        course: page.course,
        city: page.city,
      }))
    ),
  ].filter((schema): schema is Record<string, unknown> => Boolean(schema))

  const internalLinkCandidates = await getAllPublishedPagesDetailed(1500)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <SchemaMarkup schemas={[...schemas, ...aeoSchemas]} />
      <TrackRecentlyViewed slug={slug} />
      {/* 1. BREADCRUMB + SEO HEAD */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          ...(page.course ? [{ label: String(page.course), href: `/courses/${encodeURIComponent(String(page.course).toLowerCase().replace(/\s+/g, '-'))}` }] : []),
          ...(page.city ? [{ label: String(page.city), href: `/cities/${encodeURIComponent(String(page.city).toLowerCase().replace(/\s+/g, '-'))}` }] : []),
          { label: String(seo.title || page.page_title || page.slug || 'College') },
        ]}
      />

      <header className="space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#000000]">
          {seo.h1 || page.h1_text || page.page_title}
        </h1>
      </header>

      {/* 2. STATS BAR */}
      {content.intro?.stats && content.intro.stats.length > 0 && (
        <section className="stats-bar grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-[#fafafa] p-6 border border-[#e5e5e5]">
          {content.intro.stats.slice(0, 4).map((s: any, i: number) => (
            <div key={i} className="text-center space-y-2">
               <p className="text-2xl font-bold text-[#14213d]">{s.value}</p>
               <p className="text-sm font-medium text-[#666666] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* 3. INTRO PARAGRAPH */}
      {content.intro?.paragraph && (
        <section className="page-intro rounded-lg bg-[#f5f7fb] p-6 sm:p-8 border-l-4 border-[#14213d]">
          <p className="text-lg text-[#333333] leading-relaxed">
            {content.intro.paragraph}
          </p>
        </section>
      )}

      <AEOContent page={page} colleges={colleges} faqs={faqs} />

      {/* 4. COLLEGE CARDS SECTION (Client Component) */}
      {colleges.length > 0 && (
        <section id="top-colleges">
          <CollegeCardsSection 
            heading={`Top ${page.course || ''} Colleges in ${page.city || ''}`.trim()} 
            colleges={colleges}
            defaultCourse={page.course || null}
            city={page.city || null}
            sourcePageSlug={slug}
            sourcePageTitle={page.page_title || page.h1_text || seo.title || null}
          />
        </section>
      )}

      {/* 5. COMPARISON TABLE */}
      {comparisonRows.length > 0 && (
        <section id="comparison" className="space-y-4">
          <h2 className="text-2xl font-bold text-[#000000]">Quick Comparison</h2>
          <div id="comparison-table" className="overflow-x-auto rounded-lg border border-[#e5e5e5] shadow-sm">
            <table className="min-w-full divide-y border-collapse divide-[#e5e5e5] text-sm">
              <thead className="bg-[#fafafa] sticky top-0">
                <tr>
                  {comparisonHeaders.map((key: string, i: number) => (
                    <th key={key} className="px-6 py-3 text-left font-semibold text-[#000000] uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] bg-white">
                {comparisonRows.map((row: any, i: number) => {
                  const isFeatured = row.is_featured || row.name?.includes('Top Pick')
                  return (
                    <tr key={i} className={isFeatured ? 'bg-[#fff8ec]' : 'hover:bg-[#fafafa]'}>
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className="whitespace-nowrap px-6 py-4 text-[#333333] font-medium">
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. PRIVATE VS GOVT SECTION */}
      {content.private_vs_govt && (
        <section id="govt-vs-private" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#000000]">Private vs Govt Colleges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#14213d]">Private College Advantages</h3>
              <ul className="space-y-3">
                {(content.private_vs_govt.private_advantages || []).map((adv: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[#333333]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff1db] text-[#fca311]" aria-hidden="true">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
                        <path d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.157 6.113-2.435-2.435a1 1 0 10-1.414 1.414l3.14 3.14a1 1 0 001.412.002l6.862-6.816z" />
                      </svg>
                    </span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#14213d]">Govt College Advantages</h3>
              <ul className="space-y-3">
                {(content.private_vs_govt.govt_advantages || []).map((adv: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[#333333]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff1db] text-[#fca311]" aria-hidden="true">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
                        <path d="M16.704 5.29a1 1 0 00-1.408-1.418l-6.157 6.113-2.435-2.435a1 1 0 10-1.414 1.414l3.14 3.14a1 1 0 001.412.002l6.862-6.816z" />
                      </svg>
                    </span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {content.private_vs_govt.verdict && (
             <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-6 text-center">
                 <span className="text-sm font-bold uppercase tracking-wider text-[#14213d] block mb-2">Verdict</span>
                <p className="text-lg verdict-text">{content.private_vs_govt.verdict}</p>
             </div>
          )}
        </section>
      )}

      {/* 7. ADMISSION STEPS */}
      {content.admission_process?.steps && content.admission_process.steps.length > 0 && (
        <section id="admission-process" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#000000]">Admission Process</h2>
          <div className="relative border-l-2 border-[#e5e5e5] ml-4 sm:ml-6 space-y-10 py-4">
            {content.admission_process.steps.map((step: any, i: number) => (
              <div key={i} className="relative pl-8">
                <span className="absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full bg-[#fca311] text-sm font-bold text-white shadow ring-4 ring-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#000000] mb-1">{step.title}</h3>
                  <p className="text-[#666666]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. FAQ SECTION */}
      {faqs.length > 0 && (
        <section id="faqs" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#000000]">Frequently Asked Questions</h2>
          <div itemScope itemType="https://schema.org/FAQPage" className="space-y-4">
            {faqs.map((faq: any, i: number) => (
              <div key={i} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <details className="group rounded-lg border border-[#e5e5e5] bg-white shadow-sm open:ring-2 open:ring-[#29447e]/20">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-[#000000] hover:text-[#14213d] marker:content-none">
                    <span itemProp="name">{faq.question}</span>
                    <span className="ml-4 transition-transform group-open:rotate-180">
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </span>
                  </summary>
                  <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" className="border-t border-[#e5e5e5] p-4 text-[#666666] leading-relaxed">
                    <div itemProp="text" className="faq-answer">
                      {faq.answer}
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. RELATED PAGES */}
      {content.related_pages && content.related_pages.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[#000000]">Related Pages</h2>
          <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x">
            {content.related_pages.map((rp: any, i: number) => (
              <Link href={`/colleges/${rp.slug || ''}`} key={i} prefetch className="block shrink-0 snap-start w-[280px] sm:w-[320px]">
                <Card className="h-full flex flex-col justify-between transition-transform hover:-translate-y-1 hover:shadow-md border border-[#e5e5e5]">
                  <h3 className="font-bold text-[#000000] mb-2">{rp.title}</h3>
                  <div className="mt-auto">
                    <span className="text-sm font-medium text-[#14213d] hover:text-[#14213d] inline-flex items-center">
                      View Details <span className="ml-1">&rarr;</span>
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <InternalLinks currentPage={page} allPages={internalLinkCandidates} />

      {/* 10. CTA BANNER */}
      {content.cta && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fafafa] via-[#f5f5f5] to-[#fafafa] px-6 py-12 sm:px-12 sm:py-16 text-center text-[#000000] shadow-xl">
          <div className="relative z-10 flex flex-col items-center gap-6">
             <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
               {content.cta.heading || 'Ready to start your journey?'}
             </h2>
             <p className="max-w-2xl text-lg text-[#666666]">
               {content.cta.subtext || 'Get free counseling and detailed fee structures from experts today.'}
             </p>
             {isInternalCtaHref ? (
               <Link href={String(ctaHref)} prefetch className={ctaButtonClassName}>
                 {ctaButtonText}
               </Link>
             ) : (
               <a href={String(ctaHref)} className={ctaButtonClassName} rel="noopener noreferrer">
                 {ctaButtonText}
               </a>
             )}
          </div>
        </section>
      )}

    </main>
  )
}
