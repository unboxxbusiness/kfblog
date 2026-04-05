import ApplyLeadForm from '../../components/apply/ApplyLeadForm'
import Breadcrumb from '../../components/seo/Breadcrumb'
import { getCourses } from '../../lib/api'
import { generateApplyPageMetadata } from '../../lib/seo-engine'

type SearchParamsInput = { [key: string]: string | string[] | undefined }

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

const fallbackCourses = ['B.Tech', 'MBBS', 'MBA', 'BBA', 'B.Sc', 'MCA']

export async function generateMetadata({ searchParams }: { searchParams?: Promise<SearchParamsInput> }) {
  const resolvedSearchParams = (await searchParams) || {}
  const course = firstValue(resolvedSearchParams.course)
  const city = firstValue(resolvedSearchParams.city)

  return generateApplyPageMetadata(course || undefined, city || undefined)
}

export default async function ApplyPage({ searchParams }: { searchParams?: Promise<SearchParamsInput> }) {
  const resolvedSearchParams = (await searchParams) || {}
  const initialCourse = firstValue(resolvedSearchParams.course)
  const collegeName = firstValue(resolvedSearchParams.college)
  const sourcePageSlug = firstValue(resolvedSearchParams.source_page_slug)
  const sourcePageTitle = firstValue(resolvedSearchParams.source_page_title)

  const fetchedCourses = await getCourses()
  const courses = fetchedCourses.length > 0 ? fetchedCourses : fallbackCourses

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Apply' },
        ]}
      />

      <section className="rounded-2xl border border-[#e5e5e5] bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold text-[#000000] sm:text-4xl">Apply Now</h1>
        <p className="mt-3 max-w-3xl text-base text-[#666666] sm:text-lg">
          Fill out this quick form and our admissions team will help you with eligibility, fees, and next steps.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#000000]">Why apply here?</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#333333]">
            <li>Get personalized course and admission guidance.</li>
            <li>Understand fee range, scholarships, and timelines.</li>
            <li>Connect with counselors for the latest intake updates.</li>
          </ul>

          {(collegeName || initialCourse || sourcePageTitle) && (
            <div className="mt-6 rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm">
              <p className="font-semibold text-[#000000]">Selected context</p>
              {collegeName ? <p className="mt-2 text-[#333333]">College: {collegeName}</p> : null}
              {initialCourse ? <p className="mt-1 text-[#333333]">Course: {initialCourse}</p> : null}
              {sourcePageTitle ? <p className="mt-1 text-[#333333]">Source: {sourcePageTitle}</p> : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#000000]">Application Form</h2>
          <p className="mt-2 text-sm text-[#666666]">All fields are required.</p>

          <div className="mt-5">
            <ApplyLeadForm
              courses={courses}
              initialCourse={initialCourse}
              sourcePageSlug={sourcePageSlug || null}
              sourcePageTitle={sourcePageTitle || null}
              collegeName={collegeName || null}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
