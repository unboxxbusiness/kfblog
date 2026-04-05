export default function GlobalLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e5e5e5] border-t-[#14213d]" />
        <p className="text-sm font-medium text-[#666666]">Loading, please wait...</p>
      </div>
    </div>
  )
}
