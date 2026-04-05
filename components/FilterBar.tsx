'use client'

import * as React from 'react'
import Link from 'next/link'
import Button from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

type FilterBarProps = {
  courses: string[]
  cities: string[]
  feeRanges: string[]
  examTypes: string[]
  totalResults: number
  initialFilters: {
    q: string
    course: string
    city: string
    fee_range: string
    exam_type: string
  }
}

export default function FilterBar({
  courses, cities, feeRanges, examTypes, totalResults, initialFilters
}: FilterBarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false)
  const mobileFiltersPanelId = React.useId()

  const courseOptions = courses.map(c => ({ label: c, value: c }))
  const cityOptions = cities.map(c => ({ label: c, value: c }))
  const feeRangeOptions = feeRanges.map(f => ({ label: f, value: f }))
  const examTypeOptions = examTypes.map(e => ({ label: e, value: e }))

  const hasActiveFilters = Boolean(
    initialFilters.q ||
    initialFilters.course ||
    initialFilters.city ||
    initialFilters.fee_range ||
    initialFilters.exam_type
  )

  return (
    <div className="z-10 border-b border-[#e5e5e5] bg-[#fafafa]/95 py-4 backdrop-blur-sm md:sticky md:top-0">
      <form action="/" method="get" className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 md:hidden">
          <div className="text-sm font-medium text-[#333333]">
            {totalResults} {totalResults === 1 ? 'Page' : 'Pages'} Found
          </div>
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls={mobileFiltersPanelId}
            className="rounded-md border border-[#e5e5e5] px-3 py-1.5 text-sm font-medium text-[#14213d]"
          >
            {isMobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <div
          id={mobileFiltersPanelId}
          className={isMobileFiltersOpen ? 'block space-y-4 md:block' : 'hidden space-y-4 md:block'}
        >
          {/* Search row */}
          <div className="flex w-full items-center gap-2">
            <div className="flex-1">
              <Input 
                name="q"
                placeholder="Search by course, city or keyword..." 
                defaultValue={initialFilters.q}
              />
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
            <Select 
              name="course"
              placeholder="All Courses" 
              options={courseOptions} 
              defaultValue={initialFilters.course}
            />
            <Select 
              name="city"
              placeholder="All Cities" 
              options={cityOptions} 
              defaultValue={initialFilters.city}
            />
            <Select 
              name="fee_range"
              placeholder="All Fee Ranges" 
              options={feeRangeOptions} 
              defaultValue={initialFilters.fee_range}
            />
            <Select 
              name="exam_type"
              placeholder="All Exams" 
              options={examTypeOptions} 
              defaultValue={initialFilters.exam_type}
            />
          </div>
        </div>

        {/* Action row */}
        <div className={isMobileFiltersOpen ? 'flex flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between' : 'hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between'}>
          <div className="hidden text-sm font-medium text-[#333333] md:block">
            {totalResults} {totalResults === 1 ? 'Page' : 'Pages'} Found
          </div>
          <div className="flex w-full items-center gap-3 md:w-auto">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#e5e5e5] px-3 text-sm font-medium text-[#14213d] md:h-auto md:border-0 md:px-0"
            >
              {hasActiveFilters ? 'Clear Filters' : 'Reset'}
            </Link>
            <Button type="submit" className="flex-1 justify-center md:flex-none">Apply Filters</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
