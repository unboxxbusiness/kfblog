"use client"

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'

type FooterLinksResponse = {
  courses?: string[]
  cities?: string[]
  exams?: string[]
}

const FALLBACK_COURSES = ['MBA', 'B.Tech', 'MBBS', 'BBA', 'BCA', 'M.Tech', 'B.Com', 'LLB']
const FALLBACK_CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Jaipur']
const FALLBACK_EXAMS = ['JEE Main', 'NEET', 'CAT', 'CUET', 'GATE', 'CLAT', 'XAT', 'MAT']

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function pickPopular(values: string[], fallback: string[]) {
  const source = values.length > 0 ? values : fallback
  return source.slice(0, 8)
}

export default function Footer() {
  const [courses, setCourses] = React.useState<string[]>([])
  const [cities, setCities] = React.useState<string[]>([])
  const [exams, setExams] = React.useState<string[]>([])

  React.useEffect(() => {
    let isMounted = true

    const loadFooterLinks = async () => {
      try {
        const response = await fetch('/api/footer-links', { cache: 'no-store' })
        if (!response.ok) return

        const payload = (await response.json()) as FooterLinksResponse
        if (!isMounted) return

        setCourses(Array.isArray(payload.courses) ? payload.courses : [])
        setCities(Array.isArray(payload.cities) ? payload.cities : [])
        setExams(Array.isArray(payload.exams) ? payload.exams : [])
      } catch {
        // Keep fallback values when API is unavailable.
      }
    }

    loadFooterLinks()
    return () => {
      isMounted = false
    }
  }, [])

  const popularCourses = pickPopular(courses, FALLBACK_COURSES)
  const popularCities = pickPopular(cities, FALLBACK_CITIES)
  const popularExams = pickPopular(exams, FALLBACK_EXAMS)
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-14 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#000000]">Popular Courses</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#666666]">
              {popularCourses.map((course: string) => (
                <li key={course}>
                  <Link href={`/courses/${slugify(course)}`} prefetch className="hover:text-[#14213d]">{course}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#000000]">Popular Cities</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#666666]">
              {popularCities.map((city: string) => (
                <li key={city}>
                  <Link href={`/cities/${slugify(city)}`} prefetch className="hover:text-[#14213d]">{city}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#000000]">Popular Exams</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#666666]">
              {popularExams.map((exam: string) => (
                <li key={exam}>
                  <Link href={`/search?q=${encodeURIComponent(exam)}`} prefetch className="hover:text-[#14213d]">{exam}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-10 border-t pt-8">
          <div className="mb-3 inline-flex items-center" aria-label="Kampus Filter brand">
            <Image
              src="/brand/logo-kampus-filter.webp"
              alt="Kampus Filter"
              width={180}
              height={40}
              className="h-9 w-auto"
            />
          </div>
          <h4 className="text-base font-bold text-[#000000]">About Kampus Filter</h4>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#666666]">
            Kampus Filter helps students compare colleges by course, city, fees, placements, and exam eligibility.
            We aggregate public admissions information for easier decision-making.
          </p>
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-[#666666]">
            Disclaimer: Admissions data may change by institute policy, reservation category, and annual counseling rounds.
            Always verify latest details on the official college website before applying.
          </p>
        </section>

        <section className="mt-8 flex flex-col items-start justify-between gap-2 border-t pt-5 text-sm text-[#666666] sm:flex-row sm:items-center">
          <p>© {currentYear} Kampus Filter. All rights reserved.</p>
          <p>Data updated for {currentYear} admissions.</p>
        </section>
      </div>
    </footer>
  )
}
