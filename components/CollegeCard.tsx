'use client'

import * as React from 'react'
import Link from 'next/link'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Button from './ui/Button'
import {
  getComparePages,
  isSavedPage,
  toggleComparePage,
  toggleSavedPage
} from '../lib/browserStorage'
import { getPackageLabel, getPlacementLabel } from '../lib/pageMetrics'

type Props = {
  page?: any
  college?: any
  slug?: string
  title?: string
  course?: string
  city?: string
  feeRange?: string
  examType?: string
  avgPlacement?: string
  avgPackage?: string
  showRemove?: boolean
  onRemove?: (slug: string) => void
}

export default function CollegeCard({
  page,
  college,
  slug,
  title,
  course,
  city,
  feeRange,
  examType,
  avgPlacement,
  avgPackage,
  showRemove,
  onRemove
}: Props) {
  const resolvedSlug = slug || page?.slug || college?.slug || ''
  const resolvedTitle = title || page?.page_title || page?.h1_text || college?.name || resolvedSlug
  const resolvedCourse = course || page?.course || college?.course
  const resolvedCity = city || page?.city || college?.city
  const resolvedFeeRange = feeRange || page?.fee_range || college?.fees || college?.fees_per_year
  const resolvedExamType = examType || page?.exam_type
  const resolvedPlacement = avgPlacement || (page ? getPlacementLabel(page) : String(college?.placement_percent || 'N/A'))
  const resolvedPackage = avgPackage || (page ? getPackageLabel(page) : String(college?.avg_package_lpa || 'N/A'))

  const [saved, setSaved] = React.useState(false)
  const [compared, setCompared] = React.useState(false)
  const [warn, setWarn] = React.useState('')

  React.useEffect(() => {
    if (!resolvedSlug) return
    const sync = () => {
      setSaved(isSavedPage(resolvedSlug))
      setCompared(getComparePages().includes(resolvedSlug))
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('kf:storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('kf:storage', sync)
    }
  }, [resolvedSlug])

  const handleToggleSaved = () => {
    if (!resolvedSlug) return
    const next = toggleSavedPage(resolvedSlug)
    setSaved(next)
  }

  const handleToggleCompare = () => {
    if (!resolvedSlug) return
    const result = toggleComparePage(resolvedSlug)
    if (!result.ok && result.message) {
      setWarn(result.message)
      return
    }
    setWarn('')
    setCompared(result.selected)
  }

  return (
    <Card className="h-full border border-[#e5e5e5] transition-shadow duration-200 hover:border-[#29447e] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-lg font-bold text-[#000000]">{resolvedTitle}</h3>
        <button
          type="button"
          onClick={handleToggleSaved}
          title={saved ? 'Remove from saved' : 'Save this page'}
          className={`rounded-md p-2 ${saved ? 'bg-[#fff4df] text-[#d68502]' : 'bg-[#f5f5f5] text-[#666666] hover:text-[#333333]'}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M6 3a2 2 0 00-2 2v16l8-4 8 4V5a2 2 0 00-2-2H6z" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {resolvedCourse && <Badge className="bg-[#f5f7fb] text-[#14213d]">{resolvedCourse}</Badge>}
        {resolvedCity && <Badge className="bg-[#f5f5f5] text-[#333333]">{resolvedCity}</Badge>}
        {resolvedFeeRange && <Badge className="bg-[#f5f7fb] text-[#14213d]">{String(resolvedFeeRange)}</Badge>}
        {resolvedExamType && <Badge className="bg-[#fff8ec] text-[#d68502]">{resolvedExamType}</Badge>}
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-[#fafafa] p-3 text-sm text-[#333333]">
        <div className="flex justify-between"><span>Avg Placement</span><span className="font-medium text-[#000000]">{resolvedPlacement}</span></div>
        <div className="flex justify-between"><span>Avg Package</span><span className="font-medium text-[#000000]">{resolvedPackage}</span></div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[#333333]">
          <input type="checkbox" checked={compared} onChange={handleToggleCompare} />
          <span>Compare</span>
        </label>
        <div className="flex items-center gap-2">
          {showRemove && resolvedSlug && (
            <Button variant="ghost" onClick={() => onRemove && onRemove(resolvedSlug)}>
              Remove
            </Button>
          )}
          {resolvedSlug && (
            <Link
              href={`/colleges/${resolvedSlug}`}
              prefetch
              className="rounded-md bg-[#fca311] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d68502]"
            >
              View Details
            </Link>
          )}
        </div>
      </div>

      {warn && <p className="mt-2 text-xs text-[#d68502]">{warn}</p>}
    </Card>
  )
}
