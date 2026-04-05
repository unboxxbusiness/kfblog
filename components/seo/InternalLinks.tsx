import Link from 'next/link'
import type { Page } from '../../lib/types'
import { generateInternalLinks } from '../../lib/internal-links'

type InternalLinksProps = {
  currentPage: Page
  allPages: Page[]
}

function LinkCard({
  href,
  title,
  placementPercent,
  feeRange,
}: {
  href: string
  title: string
  placementPercent: number
  feeRange: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[#e5e5e5] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#29447e] hover:shadow-sm"
    >
      <p className="line-clamp-2 text-sm font-semibold text-[#000000]">{title}</p>
      <p className="mt-1 text-xs text-[#666666]">Placement: {placementPercent > 0 ? `${placementPercent}%` : 'Data available on page'}</p>
      <p className="mt-0.5 text-xs text-[#666666]">Fee range: {feeRange || 'N/A'}</p>
    </Link>
  )
}

export default function InternalLinks({ currentPage, allPages }: InternalLinksProps) {
  const links = generateInternalLinks(currentPage, allPages)

  if (links.sameCourse.length === 0 && links.sameCity.length === 0 && links.sameFeeRange.length === 0) {
    return null
  }

  const course = String(currentPage.course || '').trim()
  const city = String(currentPage.city || '').trim()

  return (
    <section className="space-y-5 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6">
      <h2 className="text-2xl font-bold text-[#000000]">You might also like</h2>

      <nav aria-label="Related college options" className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#14213d]">More {course || 'course'} options</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.sameCourse.map((link) => (
              <LinkCard
                key={`${link.group}-${link.href}`}
                href={link.href}
                title={link.title}
                placementPercent={link.placementPercent}
                feeRange={link.feeRange}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#14213d]">More options in {city || 'this city'}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.sameCity.map((link) => (
              <LinkCard
                key={`${link.group}-${link.href}`}
                href={link.href}
                title={link.title}
                placementPercent={link.placementPercent}
                feeRange={link.feeRange}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-[#14213d]">Similar budget options</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {links.sameFeeRange.map((link) => (
              <LinkCard
                key={`${link.group}-${link.href}`}
                href={link.href}
                title={link.title}
                placementPercent={link.placementPercent}
                feeRange={link.feeRange}
              />
            ))}

            {links.hubs.map((link) => (
              <Link
                key={`${link.group}-${link.href}`}
                href={link.href}
                className="flex items-center justify-center rounded-lg border border-dashed border-[#c8d3e8] bg-white p-3 text-center text-sm font-semibold text-[#14213d] hover:border-[#29447e]"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </section>
  )
}
