import { notFound } from 'next/navigation'
import { getCourses, searchPages } from '../../../lib/api'
import CityCard from '../../../components/CityCard'
import AllPagesTable from '../../../components/AllPagesTable'
import Breadcrumb from '../../../components/seo/Breadcrumb'
import { generateHubMetadata } from '../../../lib/seo-engine'

export const revalidate = 3600

function slugify(s: string) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export async function generateStaticParams() {
  const courses = await getCourses()
  return courses.map((c) => ({ course: slugify(c) }))
}

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const resolvedParams = await params
  const courses = await getCourses()
  const real = courses.find((c) => slugify(c) === resolvedParams.course)
  if (!real) {
    return {
      title: 'Courses',
      robots: { index: false, follow: false },
    }
  }

  const res = await searchPages({ course: real, limit: 1000 })
  const pages = res.data || []

  const feeNumbers = pages
    .flatMap((page: any) => String(page.fee_range || '').match(/\d[\d,]*/g) || [])
    .map((value: string) => Number(value.replace(/,/g, '')))
    .filter((value: number) => Number.isFinite(value) && value > 0)

  const cityCount = new Set(pages.map((page: any) => String(page.city || '').trim()).filter(Boolean)).size
  const examTypesCount = new Set(pages.map((page: any) => String(page.exam_type || '').trim()).filter(Boolean)).size

  return generateHubMetadata('course', real, res.count, {
    minFee: feeNumbers.length ? Math.min(...feeNumbers) : 0,
    maxFee: feeNumbers.length ? Math.max(...feeNumbers) : 0,
    cityCount,
    examTypesCount,
  })
}

export default async function CourseHub({ params }: { params: Promise<{ course: string }> }) {
  const resolvedParams = await params
  const courses = await getCourses()
  const realCourse = courses.find((c) => slugify(c) === resolvedParams.course)
  if (!realCourse) notFound()
  const currentYear = new Date().getFullYear()

  // fetch all pages for this course (full content_json included)
  const res = await searchPages({ course: realCourse, limit: 1000 })
  const pages = res.data || []

  const citiesSet = new Set(pages.map((p) => p.city).filter(Boolean))
  const citiesCount = citiesSet.size

  // extract numeric fee numbers when possible
  const feeNumbers: number[] = []
  pages.forEach((p: any) => {
    const fr = String(p.fee_range || '')
    const nums = fr.match(/\d[\d,]*/g)
    if (nums) nums.forEach((n) => feeNumbers.push(parseInt(n.replace(/,/g, ''), 10)))
  })

  let feeRangeStr = '—'
  if (feeNumbers.length > 0) {
    const min = Math.min(...feeNumbers)
    const max = Math.max(...feeNumbers)
    feeRangeStr = `₹${min.toLocaleString()} to ₹${max.toLocaleString()}`
  } else {
    feeRangeStr = Array.from(new Set(pages.map((p: any) => p.fee_range).filter(Boolean))).slice(0, 3).join(', ') || '—'
  }

  const examTypes = Array.from(new Set(pages.map((p: any) => p.exam_type).filter(Boolean)))

  // group by city
  const byCity: Record<string, any[]> = {}
  pages.forEach((p: any) => {
    const city = p.city || 'Unknown'
    byCity[city] = byCity[city] || []
    byCity[city].push(p)
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: `Best ${realCourse} Colleges` },
        ]}
      />

      {/* HERO */}
      <section className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Best {realCourse} Colleges in India {currentYear}</h1>
        <p className="mt-2 text-sm text-[#666666]">
          Compare {citiesCount} cities, fees from {feeRangeStr}, available via {examTypes.join(', ') || 'Various exams'}
        </p>
      </section>

      {/* QUICK STATS ROW */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#14213d]">{pages.length}</div>
          <div className="text-sm text-[#666666]">Total Pages</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#14213d]">{citiesCount}</div>
          <div className="text-sm text-[#666666]">Cities Covered</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#14213d]">{feeRangeStr}</div>
          <div className="text-sm text-[#666666]">Fee Range</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#14213d]">{examTypes.length}</div>
          <div className="text-sm text-[#666666]">Exam Types</div>
        </div>
      </section>

      {/* CITY GRID */}
      <section>
        <h2 className="text-xl font-bold text-[#000000] mb-4">Cities offering {realCourse}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byCity).map(([city, list]) => (
            <div key={city}>
              <CityCard city={city} pages={list} course={realCourse} />
            </div>
          ))}
        </div>
      </section>

      {/* ALL PAGES TABLE */}
      <section>
        <h2 className="text-xl font-bold text-[#000000] mb-4">All Pages</h2>
        <AllPagesTable pages={pages} />
      </section>

    </main>
  )
}
