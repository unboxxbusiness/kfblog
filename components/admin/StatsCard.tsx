'use client'

import * as React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type StatsCardProps = {
  title: string
  value: number
  trendText?: string
  subtitle?: string
  icon: LucideIcon
  borderColor: string
  iconBg: string
  iconColor: string
  href?: string
  pulseDot?: boolean
  badgeText?: string
}

export default function StatsCard({
  title,
  value,
  trendText,
  subtitle,
  icon: Icon,
  borderColor,
  iconBg,
  iconColor,
  href,
  pulseDot,
  badgeText,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    let frame = 0
    const duration = 900
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  const cardBody = (
    <article
      className="relative rounded-2xl border border-[#dbe3f1] bg-gradient-to-b from-white to-[#f8fbff] p-5 shadow-[0_8px_28px_rgba(15,23,42,0.07)] transition-transform duration-200 hover:-translate-y-0.5"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#334155]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#0f172a]">{displayValue.toLocaleString()}</p>
          {subtitle ? <p className="mt-1 text-xs text-[#475569]">{subtitle}</p> : null}
          {trendText ? <p className="mt-2 text-xs font-medium text-[#1f7a1f]">{trendText}</p> : null}
          {badgeText ? (
            <span className="mt-2 inline-flex rounded-full bg-[#fff8ec] px-2 py-0.5 text-[10px] font-semibold text-[#d68502]">
              {badgeText}
            </span>
          ) : null}
        </div>

        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          {pulseDot ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )

  if (!href) return cardBody

  return (
    <Link href={href} prefetch className="block w-full text-left">
      {cardBody}
    </Link>
  )
}
