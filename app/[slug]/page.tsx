// Use dynamic imports for local modules to avoid static module-resolution errors in environments
// where dependencies/types may not be installed at analysis time.
import { toSafeJsonLd } from '../../lib/safeJsonLd'

export const revalidate = 3600 // ISR: 1 hour

export async function generateStaticParams() {
  try {
    const sup = await import('../../lib/supabase')
    const slugs = await sup.getAllPublishedSlugs()
    return slugs.map((s: string) => ({ slug: s }))
  } catch (err) {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<any> {
  const { supabase } = await import('../../lib/supabase')
  const { data: page, error } = await supabase
    .from('pages')
    .select('page_title, meta_desc, h1_text, content_json')
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle()
  if (error || !page) return { title: 'Page not found' }

  const seo = page.content_json?.seo || {}
  const title = seo.title || page.page_title || page.h1_text || params.slug
  const description = seo.meta_desc || page.meta_desc || ''
  const ogImage = seo.og_image || seo.image || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined
    }
  }
}

export default async function Page({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const { supabase } = await import('../../lib/supabase')
  const { data: page, error } = await supabase
    .from('pages')
    .select('id, slug, course, city, fee_range, exam_type, college_type, page_title, meta_desc, h1_text, content_json, published, created_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error || !page) {
    return (
      <div className="rounded-lg bg-white p-6 text-center">
        <h1 className="text-2xl font-bold">404 — Page not found</h1>
        <p className="mt-2 text-[#333333]">The page you're looking for does not exist or is not published.</p>
      </div>
    )
  }

  const content = page.content_json || {}
  const seo = content.seo || {}

  // Breadcrumb JSON-LD
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": 'https://example.com' },
      { "@type": "ListItem", "position": 2, "name": page.page_title || page.h1_text || slug, "item": `https://example.com/${slug}` }
    ]
  }
  const [
    { default: CollegeCard },
    { default: StatsGrid },
    { default: ComparisonTable },
    { default: FAQAccordion },
    { default: Steps },
    { default: CTA }
  ] = await Promise.all([
    import('../../components/CollegeCard'),
    import('../../components/StatsGrid'),
    import('../../components/ComparisonTable'),
    import('../../components/FAQAccordion'),
    import('../../components/Steps'),
    import('../../components/CTA')
  ])

  return (
    <article className="space-y-8">
      <head>
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLd(breadcrumb) }}
        />
      </head>

      {/* Hero */}
      <section className="rounded-lg bg-white p-6">
        <h1 className="text-3xl font-bold">{content.h1_text || page.h1_text || page.page_title}</h1>
        {content.intro?.paragraph && <p className="mt-2 text-[#333333]">{content.intro.paragraph}</p>}
        {content.intro?.stats && <div className="mt-4"><StatsGrid stats={content.intro.stats} /></div>}
      </section>

      {/* Filters Summary */}
      <section className="rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Filters</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <span className="rounded-md bg-[#f5f5f5] px-3 py-1 text-sm">Course: {page.course || content.filters?.course || 'Any'}</span>
          <span className="rounded-md bg-[#f5f5f5] px-3 py-1 text-sm">City: {page.city || content.filters?.city || 'Any'}</span>
          <span className="rounded-md bg-[#f5f5f5] px-3 py-1 text-sm">Fee: {page.fee_range || content.filters?.fee_range || 'Any'}</span>
          <span className="rounded-md bg-[#f5f5f5] px-3 py-1 text-sm">Exam: {page.exam_type || content.filters?.exam_type || 'Any'}</span>
        </div>
      </section>

      {/* College Cards */}
      <section className="space-y-4">
        {Array.isArray(content.colleges) && content.colleges.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.colleges.map((c: any, idx: number) => (
              <div key={c.slug || c.name || idx}>
                <CollegeCard
                  college={c}
                  slug={page.slug}
                  title={c.name || page.page_title || page.h1_text}
                  course={page.course}
                  city={page.city}
                  feeRange={page.fee_range}
                  examType={page.exam_type}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6">No colleges listed.</div>
        )}
      </section>

      {/* Comparison Table */}
      {content.comparison_table && (
        <section className="rounded-lg bg-white p-6">
          <h2 className="text-lg font-semibold">Comparison</h2>
          <ComparisonTable table={content.comparison_table} />
        </section>
      )}

      {/* Private vs Govt */}
      {content.private_vs_govt && (
        <section className="rounded-lg bg-white p-6">
          <h2 className="text-lg font-semibold">Private vs Government</h2>
          {content.private_vs_govt.pros && (
            <ul className="mt-3 list-disc list-inside text-[#333333]">
              {content.private_vs_govt.pros.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {content.private_vs_govt.verdict && <p className="mt-3 text-[#333333]">{content.private_vs_govt.verdict}</p>}
        </section>
      )}

      {/* Admission Process */}
      {content.admission_process?.steps && (
        <section className="rounded-lg bg-white p-6">
          <h2 className="text-lg font-semibold">Admission Process</h2>
          <Steps steps={content.admission_process.steps} />
        </section>
      )}

      {/* FAQs */}
      {content.faqs && content.faqs.length > 0 && (
        <section className="rounded-lg bg-white p-6">
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
          <FAQAccordion faqs={content.faqs} />
        </section>
      )}

      {/* CTA */}
      {content.cta && (
        <section className="rounded-lg bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-6 text-[#000000]">
          <CTA
            cta={content.cta}
            sourceCourse={page.course || null}
            sourcePageSlug={slug}
            sourcePageTitle={page.page_title || page.h1_text || slug}
          />
        </section>
      )}

      {/* Related pages */}
      {content.related_pages && content.related_pages.length > 0 && (
        <section className="rounded-lg bg-white p-6">
          <h3 className="text-lg font-semibold">Related Pages</h3>
          <ul className="mt-3 space-y-2 text-[#333333]">
            {content.related_pages.map((rp: any, i: number) => (
              <li key={i}><a className="text-[#14213d] hover:underline" href={`/${rp.slug}`}>{rp.title || rp.slug}</a></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
