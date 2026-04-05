'use client'

import dynamic from 'next/dynamic'
import Skeleton from './ui/Skeleton'

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-48 w-full" />
    </div>
  )
}

export const RechartsArea = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

export const ExcelExporter = dynamic(
  () => import('./ExcelExporter'),
  { ssr: false }
)

export const CommandPalette = dynamic(
  () => import('./layout/CommandPalette'),
  { ssr: false }
)

export { ChartSkeleton }
