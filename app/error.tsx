'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const details =
    process.env.NODE_ENV === 'development'
      ? error?.message || 'Unknown error'
      : error?.digest
        ? `Reference: ${error.digest}`
        : 'Reference unavailable'

  return (
    <html>
      <body className="bg-[#fafafa] text-[#000000]">
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#000000]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#666666]">
              An unexpected issue occurred while loading this page. You can try again or return to homepage.
            </p>
            <p className="mt-3 rounded bg-[#fafafa] p-3 text-xs text-[#666666]">{details}</p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => reset()}
                className="rounded-md bg-[#fca311] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d68502]"
              >
                Try Again
              </button>
              <a href="/" className="rounded-md border border-[#e5e5e5] px-4 py-2 text-sm text-[#333333] hover:bg-[#fafafa]">
                Go Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
