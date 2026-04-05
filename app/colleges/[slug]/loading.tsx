export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e5e5e5] border-t-[#14213d]"></div>
        <p className="text-sm font-medium text-[#666666]">Loading college details...</p>
      </div>
    </div>
  )
}
