import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <h2 className="mb-4 text-3xl font-bold text-[#000000]">City Not Found</h2>
      <p className="mb-6 text-[#666666]">We couldn't find the city hub you requested.</p>
      <Link href="/" className="inline-flex items-center rounded-md bg-[#fca311] px-4 py-2 text-white">Return Home</Link>
    </div>
  )
}
