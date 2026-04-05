'use client'

import clsx from 'clsx'
import Link from 'next/link'

type ApplyNowCtaLinkProps = {
  course?: string | null
  collegeName?: string | null
  sourcePageSlug?: string | null
  sourcePageTitle?: string | null
  className?: string
}

function toNullableString(value: unknown): string | null {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized : null
}

function buildApplyHref(params: {
  course?: string | null
  collegeName?: string | null
  sourcePageSlug?: string | null
  sourcePageTitle?: string | null
}) {
  const search = new URLSearchParams()
  const course = toNullableString(params.course)
  const collegeName = toNullableString(params.collegeName)
  const sourcePageSlug = toNullableString(params.sourcePageSlug)
  const sourcePageTitle = toNullableString(params.sourcePageTitle)

  if (course) search.set('course', course)
  if (collegeName) search.set('college', collegeName)
  if (sourcePageSlug) search.set('source_page_slug', sourcePageSlug)
  if (sourcePageTitle) search.set('source_page_title', sourcePageTitle)

  const query = search.toString()
  return query ? `/apply?${query}` : '/apply'
}

export default function ApplyNowCtaLink({
  course,
  collegeName,
  sourcePageSlug,
  sourcePageTitle,
  className,
}: ApplyNowCtaLinkProps) {
  const href = buildApplyHref({
    course,
    collegeName,
    sourcePageSlug,
    sourcePageTitle,
  })

  return (
    <Link
      href={href}
      prefetch
      className={clsx(
        'inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#fca311] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#d68502] focus:outline-none',
        className
      )}
    >
      Apply Now
    </Link>
  )
}
