import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import SearchBar from './search-bar'
import Button from './ui/Button'

type Filters = {
  q: string
  course: string
  city: string
  fee_range: string
  exam_type: string
}

type OptimizedHeroProps = {
  courses: string[]
  cities: string[]
  feeRanges: string[]
  examTypes: string[]
  initialFilters: Filters
}

export default function OptimizedHero({
  courses,
  cities,
  feeRanges,
  examTypes,
  initialFilters,
}: OptimizedHeroProps) {
  return (
    <section className="hero relative overflow-hidden border-b border-[#e5e5e5] bg-[#ffffff]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="relative overflow-hidden rounded-3xl border border-[#e5e5e5] bg-[#14213d] px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_90%_90%,rgba(252,163,17,0.18),transparent_35%)]" />

          <div className="pointer-events-none absolute right-4 top-6 hidden w-72 md:block" aria-hidden="true">
            <Image
              src="/hero-illustration.svg"
              alt="Kampus Filter college search illustration"
              width={720}
              height={540}
              priority
              fetchPriority="high"
              className="h-auto w-full opacity-90"
            />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              Find Colleges, Courses, and Exams that fit you.
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm text-[#d7deea] sm:text-base">
              Compare real fee ranges, placement outcomes, and admission requirements across India in seconds.
            </p>

            <div className="mt-6 sm:mt-7">
              <SearchBar
                courses={courses}
                cities={cities}
                feeRanges={feeRanges}
                examTypes={examTypes}
                initialFilters={initialFilters}
              />
            </div>

            <div className="mt-4 flex justify-center">
              <Link href="/search" className="w-full sm:w-auto">
                <Button className="h-11 w-full rounded-xl bg-[#fca311] px-5 text-sm font-semibold text-white hover:bg-[#d68502] sm:w-auto">
                  Explore Colleges
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
