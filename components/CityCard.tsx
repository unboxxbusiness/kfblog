import Link from 'next/link'
import Badge from './ui/Badge'

type Props = {
  city: string
  pages: any[]
  course?: string
}

function slugify(s: string) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export default function CityCard({ city, pages, course }: Props) {
  const feeRanges = Array.from(new Set(pages.map((p: any) => p.fee_range).filter(Boolean)))
  const examTypes = Array.from(new Set(pages.map((p: any) => p.exam_type).filter(Boolean)))

  return (
    <article className="rounded-lg border border-[#e5e5e5] p-4 shadow-sm bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#000000]">{city}</h3>
          <p className="mt-1 text-sm text-[#666666]">{pages.length} colleges</p>
        </div>
        <div className="text-sm text-[#666666]">{feeRanges.length} fee ranges</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {feeRanges.slice(0, 3).map((fr) => (
          <Badge key={fr} className="bg-[#f5f7fb] text-[#14213d]">{fr}</Badge>
        ))}
        {examTypes.slice(0, 3).map((ex) => (
          <Badge key={ex} className="bg-[#fff8ec] text-[#d68502]">{ex}</Badge>
        ))}
      </div>

      <div className="mt-4">
        <Link
          href={`/cities/${slugify(city)}${course ? `?course=${encodeURIComponent(course)}` : ''}`}
          className="inline-flex items-center rounded-md bg-[#fca311] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#d68502]"
        >
          View Colleges
        </Link>
      </div>
    </article>
  )
}
