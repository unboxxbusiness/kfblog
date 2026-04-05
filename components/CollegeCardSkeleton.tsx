export default function CollegeCardSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="h-6 w-3/4 rounded bg-[#e5e5e5]" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-[#e5e5e5]" />
        <div className="h-5 w-20 rounded-full bg-[#e5e5e5]" />
        <div className="h-5 w-24 rounded-full bg-[#e5e5e5]" />
      </div>
      <div className="mt-4 space-y-2 rounded-lg bg-[#fafafa] p-3">
        <div className="h-4 w-full rounded bg-[#e5e5e5]" />
        <div className="h-4 w-5/6 rounded bg-[#e5e5e5]" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-[#e5e5e5]" />
        <div className="h-8 w-24 rounded bg-[#e5e5e5]" />
      </div>
    </div>
  )
}
