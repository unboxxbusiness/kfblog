'use client'

import * as React from 'react'

type ChartWrapperProps = {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  className?: string
}

export default function ChartWrapper({
  title,
  children,
  actions,
  loading = false,
  empty = false,
  emptyMessage = 'No data available for this chart yet.',
  className = '',
}: ChartWrapperProps) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 180)
    return () => window.clearTimeout(timer)
  }, [])

  const showSkeleton = loading || !ready

  return (
    <section className={`rounded-2xl border border-[#dbe3f1] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
        {actions}
      </div>

      {showSkeleton ? (
        <div className="h-[260px] animate-pulse rounded-xl bg-gradient-to-r from-[#f8fafc] via-[#eef2ff] to-[#f8fafc]" />
      ) : empty ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[#dbe3f1] bg-[#f8fbff] text-center">
          <div>
            <p className="text-sm font-medium text-[#1e293b]">Waiting for data</p>
            <p className="mt-1 text-xs text-[#64748b]">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <div className="h-[260px]">{children}</div>
      )}
    </section>
  )
}
