'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, Scale } from 'lucide-react'
import { toast } from 'sonner'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Card from './ui/Card'
import { getComparePages, toggleComparePage } from '../lib/browserStorage'

type DiscoveryCollegeCardProps = {
  slug: string
  title: string
  city: string
  course: string
  fees: string
  exam: string
  placement: number
  avgPackage: number
  admissionChance: number
  matchScore: number
  tags: string[]
}

function formatLpa(value: number): string {
  return `${value.toFixed(1)} LPA`
}

export default function DiscoveryCollegeCard({
  slug,
  title,
  city,
  course,
  fees,
  exam,
  placement,
  avgPackage,
  admissionChance,
  matchScore,
  tags,
}: DiscoveryCollegeCardProps) {
  const [isCompared, setIsCompared] = React.useState(false)

  React.useEffect(() => {
    const sync = () => {
      setIsCompared(getComparePages().includes(slug))
    }

    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('kf:storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('kf:storage', sync)
    }
  }, [slug])

  const onToggleCompare = React.useCallback(() => {
    const result = toggleComparePage(slug)
    if (!result.ok) {
      toast.error(result.message || 'Unable to update compare list right now.')
      return
    }

    setIsCompared(result.selected)
    toast.success(result.selected ? 'Added to compare list' : 'Removed from compare list')
  }, [slug])

  return (
    <Card className="group rounded-2xl border-[#e5e5e5] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,33,61,0.12)] active:scale-[0.995]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[#666666]">{course || 'General'}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-tight text-[#000000] md:text-lg">{title}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#333333]">
            <Building2 className="h-3.5 w-3.5 text-[#14213d]" />
            {city || 'India'}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-[#dbe1eb] bg-[#fafafa] px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#666666]">Match</p>
          <p className="text-base font-bold text-[#14213d]">{matchScore}%</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2">
          <p className="text-[11px] text-[#666666]">Placement</p>
          <p className="text-sm font-semibold text-[#14213d]">{placement}%</p>
        </div>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2">
          <p className="text-[11px] text-[#666666]">Fees</p>
          <p className="truncate text-sm font-semibold text-[#14213d]">{fees || 'Ask counsellor'}</p>
        </div>
      </div>

      <div className="mt-3 hidden grid-cols-3 gap-2 md:grid">
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5">
          <p className="text-[11px] text-[#666666]">Placement</p>
          <p className="text-sm font-semibold text-[#14213d]">{placement}%</p>
        </div>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5">
          <p className="text-[11px] text-[#666666]">Avg Package</p>
          <p className="text-sm font-semibold text-[#14213d]">{formatLpa(avgPackage)}</p>
        </div>
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5">
          <p className="text-[11px] text-[#666666]">Admission</p>
          <p className="text-sm font-semibold text-[#14213d]">{admissionChance}% chance</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tags.slice(0, 2).map((tag) => (
          <Badge key={tag} className="rounded-full border border-[#e5e5e5] bg-[#fafafa] px-2 py-1 text-[11px] font-medium text-[#333333]">
            {tag}
          </Badge>
        ))}
        <Badge className="rounded-full border border-[#e5e5e5] bg-white px-2 py-1 text-[11px] font-medium text-[#333333]">
          {exam || 'Exam optional'}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          variant={isCompared ? 'primary' : 'secondary'}
          onClick={onToggleCompare}
          className={`h-11 rounded-xl px-3 text-sm ${
            isCompared ? 'bg-[#14213d] text-white hover:bg-[#0f1a30]' : 'border-[#14213d] text-[#14213d]'
          }`}
        >
          <Scale className="h-4 w-4" />
          {isCompared ? 'Compared' : 'Compare'}
        </Button>

        <Link href={`/colleges/${encodeURIComponent(slug)}`} className="flex-1">
          <Button className="h-11 w-full rounded-xl bg-[#fca311] text-sm font-semibold text-white hover:bg-[#d68502]">
            View Profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
