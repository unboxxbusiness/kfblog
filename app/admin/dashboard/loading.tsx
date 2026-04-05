function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border border-[#e5e5e5] bg-white ${className}`} />
}

export default function AdminDashboardLoading() {
  return (
    <main className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonBox key={`kpi-${idx}`} className="h-28" />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonBox key={`chart-${idx}`} className="h-[340px]" />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SkeletonBox className="h-[420px]" />
        <SkeletonBox className="h-[420px]" />
      </section>
    </main>
  )
}
