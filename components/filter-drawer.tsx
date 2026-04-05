'use client'

import * as React from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import Button from './ui/Button'
import { Select } from './ui/Select'

type FilterValues = {
  course: string
  city: string
  fee_range: string
  exam_type: string
}

type FilterField = keyof FilterValues

type FilterDrawerProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  values: FilterValues
  onValueChange: (field: FilterField, value: string) => void
  courses: string[]
  cities: string[]
  feeRanges: string[]
  examTypes: string[]
  onApply: () => void
  onReset: () => void
}

const mapToOptions = (values: string[]) => values.map((value) => ({ label: value, value }))

export default function FilterDrawer({
  open,
  onOpenChange,
  values,
  onValueChange,
  courses,
  cities,
  feeRanges,
  examTypes,
  onApply,
  onReset,
}: FilterDrawerProps) {
  React.useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  return (
    <div className={`fixed inset-0 z-[90] md:hidden ${open ? '' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close filters"
        onClick={() => onOpenChange(false)}
        className={`absolute inset-0 bg-[#14213d]/35 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      <section
        aria-label="Filter colleges"
        className={`absolute inset-x-0 bottom-0 rounded-t-3xl border border-[#e5e5e5] bg-white shadow-[0_-10px_30px_rgba(20,33,61,0.14)] transition-transform duration-250 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#14213d]">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e5e5] text-[#333333] active:scale-[0.98]"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-4 py-4 pb-28">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666666]">Course</p>
            <Select
              value={values.course}
              onChange={(event) => onValueChange('course', event.target.value)}
              options={mapToOptions(courses)}
              placeholder="All courses"
              className="h-11 rounded-xl border-[#e5e5e5]"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666666]">City</p>
            <Select
              value={values.city}
              onChange={(event) => onValueChange('city', event.target.value)}
              options={mapToOptions(cities)}
              placeholder="All cities"
              className="h-11 rounded-xl border-[#e5e5e5]"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666666]">Fees</p>
            <Select
              value={values.fee_range}
              onChange={(event) => onValueChange('fee_range', event.target.value)}
              options={mapToOptions(feeRanges)}
              placeholder="All fee ranges"
              className="h-11 rounded-xl border-[#e5e5e5]"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#666666]">Exam</p>
            <Select
              value={values.exam_type}
              onChange={(event) => onValueChange('exam_type', event.target.value)}
              options={mapToOptions(examTypes)}
              placeholder="All exams"
              className="h-11 rounded-xl border-[#e5e5e5]"
            />
          </div>
        </div>

        <footer className="absolute inset-x-0 bottom-0 border-t border-[#e5e5e5] bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onReset()
                onOpenChange(false)
              }}
              className="h-11 w-full rounded-xl border-[#14213d]"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply()
                onOpenChange(false)
              }}
              className="h-11 w-full rounded-xl bg-[#fca311] text-white hover:bg-[#d68502]"
            >
              Apply
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
