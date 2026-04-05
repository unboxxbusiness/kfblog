'use client'

import * as React from 'react'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import ApplyNowCtaLink from '../../../components/ApplyNowCtaLink'

export default function CollegeCardsSection({
  heading,
  colleges,
  defaultCourse,
  city,
  sourcePageSlug,
  sourcePageTitle,
}: {
  heading: string
  colleges: any[]
  defaultCourse?: string | null
  city?: string | null
  sourcePageSlug?: string | null
  sourcePageTitle?: string | null
}) {
  const [filter, setFilter] = React.useState('All' as 'All' | 'Private' | 'Govt')
  const [, startTransition] = React.useTransition()

  const filteredColleges = colleges.filter((c) => {
    if (filter === 'All') return true
    if (filter === 'Private') return c.type?.toLowerCase().includes('private')
    if (filter === 'Govt') return c.type?.toLowerCase().includes('govt') || c.type?.toLowerCase().includes('government')
    return true
  })

  return (
    <section className="my-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#000000]">{heading}</h2>
        <div className="inline-flex rounded-md bg-[#f5f5f5] p-1 shadow-sm">
          {['All', 'Private', 'Govt'].map((tab) => (
            <button
              key={tab}
              onClick={() =>
                startTransition(() => {
                  setFilter(tab as any)
                })
              }
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === tab
                  ? 'bg-white text-[#14213d] shadow'
                  : 'text-[#666666] hover:text-[#000000]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredColleges.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#e5e5e5] p-8 text-center text-[#666666]">
            No {filter !== 'All' ? filter.toLowerCase() : ''} colleges found.
          </div>
        ) : (
          filteredColleges.map((c, i) => (
            <div
              key={i}
              itemScope
              itemType="https://schema.org/EducationalOrganization"
              data-college-name={String(c.name || '')}
              data-college-type={String(c.type || '')}
              data-fees={String(c.fees_per_year || c.fees || '')}
              data-placement={String(c.placement_percent || '')}
              data-naac={String(c.naac_grade || '')}
            >
            <Card className="flex flex-col md:flex-row gap-6 border border-[#e5e5e5] shadow-sm transition-shadow hover:shadow-md">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#000000]">
                      <span itemProp="name" className="featured-college-name">{c.name}</span>
                      {c.is_featured && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#fff4df] px-2 py-0.5 text-xs font-medium text-[#d68502] ring-1 ring-inset ring-[#d68502]/20">
                          Top Pick
                        </span>
                      )}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={c.type?.toLowerCase().includes('private') ? 'bg-[#f5f7fb] text-[#14213d]' : 'bg-[#f5f7fb] text-[#14213d]'}>
                        {c.type || 'Private'}
                      </Badge>
                      {c.naac_grade && <Badge className="bg-[#f5f5f5] text-[#333333]">NAAC: {c.naac_grade}</Badge>}
                      {c.cutoff && <Badge className="bg-[#f5f7fb] text-[#14213d]">Cutoff: {c.cutoff}</Badge>}
                    </div>
                  </div>
                </div>

                <span itemProp="description" className="sr-only">{Array.isArray(c.highlights) ? String(c.highlights[0] || '') : ''}</span>
                <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress" className="sr-only">
                  <span itemProp="addressLocality">{String(city || c.city || 'India')}</span>
                  <span itemProp="addressCountry">IN</span>
                </div>
                <span itemProp="foundingDate" className="sr-only">{String(c.established || '')}</span>

                <div className="grid grid-cols-2 gap-4 rounded-lg bg-[#fafafa] p-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-[#666666] mb-1">Fees</p>
                    <p className="font-semibold text-[#000000]">{c.fees || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#666666] mb-1">Placements</p>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#000000]">{c.placement_percent || 0}%</span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e5e5e5]">
                        <div
                          className="h-full bg-[#14213d]"
                          style={{ width: `${c.placement_percent || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#666666] mb-1">Avg Package</p>
                    <p className="font-semibold text-[#000000]">{c.avg_package || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#666666] mb-1">Top Recruiters</p>
                    <div className="flex -space-x-2">
                      {(c.top_recruiters || []).slice(0, 3).map((r: string, idx: number) => (
                        <div key={idx} className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-[#e5e5e5] text-[10px] font-bold text-[#666666] shadow-sm" title={r}>
                          {r.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-[#000000] mb-2">Highlights</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                      {(c.highlights || []).map((h: string, idx: number) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {c.pros && c.pros.length > 0 && (
                      <div>
                        {c.pros.map((p: string, idx: number) => (
                          <div key={idx} className="flex items-start text-[#14213d]">
                            <span className="mr-1 mt-0.5 text-xs">+</span> {p}
                          </div>
                        ))}
                      </div>
                    )}
                    {c.cons && c.cons.length > 0 && (
                      <div>
                        {c.cons.map((co: string, idx: number) => (
                          <div key={idx} className="flex items-start text-[#d68502]">
                            <span className="mr-1 mt-0.5 text-xs">-</span> {co}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex border-t border-[#e5e5e5] pt-4 md:w-48 md:flex-col md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <div className="mb-4 grid flex-1 grid-cols-2 gap-4 md:flex md:flex-col">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-[#f5f7fb] p-2 text-center">
                    <span className="text-xl font-bold text-[#14213d]">{c.value_score || '-'}</span>
                    <span className="text-xs font-medium text-[#14213d]">Value</span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-[#fff8ec] p-2 text-center">
                    <span className="text-xl font-bold text-[#d68502]">{c.difficulty_score || '-'}</span>
                     <span className="text-xs font-medium text-[#d68502]">Difficulty</span>
                  </div>
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <div className="flex justify-center gap-4 text-xs text-[#666666] mb-2">
                     <span className="flex items-center gap-1" title="Scholarships">
                        Scholarship: {c.has_scholarship ? 'Yes' : 'No'}
                     </span>
                     <span className="flex items-center gap-1" title="Hostel">
                        Hostel: {c.has_hostel ? 'Yes' : 'No'}
                     </span>
                  </div>
                  <ApplyNowCtaLink
                    course={typeof c.course === 'string' ? c.course : defaultCourse}
                    collegeName={typeof c.name === 'string' ? c.name : null}
                    sourcePageSlug={sourcePageSlug}
                    sourcePageTitle={sourcePageTitle}
                  />
                </div>
              </div>
            </Card>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
