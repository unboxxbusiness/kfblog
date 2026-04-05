'use client'

import React from 'react'
import CourseTabs from './CourseTabs'
import CollegeCardsSection from './CollegeCardsSection'
import ComparisonWidget from './ComparisonWidget'

export default function CityCardsClient({ pages, initialCourse }: { pages: any[]; initialCourse?: string }) {
  const courses = Array.from(new Set(pages.map((p) => p.course).filter(Boolean)))
  const [, startTransition] = React.useTransition()
  const [activeCourse, setActiveCourse] = React.useState(
    (initialCourse && courses.includes(initialCourse) ? initialCourse : courses[0] || null) as string | null
  )

  React.useEffect(() => {
    const next = initialCourse && courses.includes(initialCourse) ? initialCourse : courses[0] || null
    setActiveCourse(next)
  }, [initialCourse, pages])

  const filteredPages = React.useMemo(() => {
    return activeCourse ? pages.filter((p) => p.course === activeCourse) : pages
  }, [pages, activeCourse])

  // transform page -> card object compatible with CollegeCardsSection
  const cards = filteredPages.map((p: any) => {
    const mainCollege = (p.content_json?.colleges && p.content_json.colleges[0]) || {}
    const stats = p.content_json?.intro?.stats || []
    const placementStat = stats.find((s: any) => /placement/i.test(s.label || ''))
    const packageStat = stats.find((s: any) => /package|lpa/i.test(s.label || ''))

    return {
      name: p.page_title || p.h1_text || p.slug,
      course: p.course || null,
      is_featured: mainCollege.is_featured || false,
      type: p.college_type || mainCollege.type || 'Private',
      naac_grade: mainCollege.naac_grade,
      cutoff: mainCollege.cutoff,
      fees: p.fee_range,
      placement_percent: placementStat ? Number(placementStat.value) : mainCollege.placement_percent,
      avg_package: packageStat ? String(packageStat.value) : mainCollege.avg_package,
      top_recruiters: mainCollege.top_recruiters || [],
      highlights: mainCollege.highlights || [],
      pros: mainCollege.pros || [],
      cons: mainCollege.cons || [],
      value_score: mainCollege.value_score,
      difficulty_score: mainCollege.difficulty_score,
      has_scholarship: mainCollege.has_scholarship,
      has_hostel: mainCollege.has_hostel,
      source_page_slug: p.slug || null,
      source_page_title: p.page_title || p.h1_text || p.slug || null,
      apply_url: mainCollege.apply_url || `/colleges/${p.slug}`,
    }
  })

  return (
    <div className="space-y-6">
      <CourseTabs
        courses={courses}
        active={activeCourse}
        onSelect={(c) => {
          startTransition(() => {
            setActiveCourse(c)
          })
        }}
      />
      <CollegeCardsSection heading={activeCourse ? `Top ${activeCourse} Colleges` : 'All Colleges'} colleges={cards} />
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Compare Colleges</h3>
        <ComparisonWidget pages={filteredPages} />
      </div>
    </div>
  )
}
