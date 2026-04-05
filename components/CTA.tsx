import React from 'react'
import Link from 'next/link'
import { isInternalHref, normalizeCtaHref } from '../lib/cta-link'

export default function CTA({
  cta,
  sourceCourse,
  sourcePageSlug,
  sourcePageTitle,
}: {
  cta?: { heading?: string; button_text?: string; button_url?: string }
  sourceCourse?: string | null
  sourcePageSlug?: string | null
  sourcePageTitle?: string | null
}) {
  if (!cta) return null

  const buttonText = String(cta.button_text || '').trim()
  const isApplyNow = /apply\s*now/i.test(buttonText)

  const applySearch = new URLSearchParams()
  if (sourceCourse) applySearch.set('course', String(sourceCourse))
  if (sourcePageSlug) applySearch.set('source_page_slug', String(sourcePageSlug))
  if (sourcePageTitle) applySearch.set('source_page_title', String(sourcePageTitle))

  const applyHref = applySearch.toString() ? `/apply?${applySearch.toString()}` : '/apply'
  const ctaHref = isApplyNow ? applyHref : normalizeCtaHref(cta.button_url, applyHref)
  const shouldUseInternalLink = isInternalHref(ctaHref)
  const ctaButtonClassName = 'inline-flex items-center justify-center rounded-md bg-[#fca311] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#d68502] focus:outline-none'

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h3 className="text-2xl font-bold text-[#000000]">{cta.heading}</h3>
      {cta.button_text && (
        <div className="mt-4">
          {shouldUseInternalLink ? (
            <Link href={ctaHref} prefetch className={ctaButtonClassName}>
              {cta.button_text}
            </Link>
          ) : (
            <a href={ctaHref} className={ctaButtonClassName} rel="noopener noreferrer">
              {cta.button_text}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
