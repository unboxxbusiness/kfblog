import React from 'react'
import Skeleton from '../../components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6">
        <Skeleton className="h-8 w-3/4" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  )
}
