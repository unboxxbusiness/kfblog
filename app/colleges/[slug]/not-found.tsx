import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#000000]">College Not Found</h2>
      <p className="mb-8 text-lg text-[#666666]">We couldn't find the college page you're looking for.</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-[#fca311] px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#d68502]"
      >
        Return Home
      </Link>
    </div>
  )
}
