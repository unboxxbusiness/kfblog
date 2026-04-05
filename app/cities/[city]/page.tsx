import { notFound } from 'next/navigation'
import { getCities, searchPages } from '../../../lib/api'
import CityCardsClient from '../../../components/CityCardsClient'
import Breadcrumb from '../../../components/seo/Breadcrumb'
import { generateHubMetadata } from '../../../lib/seo-engine'

export const revalidate = 3600

function slugify(s: string) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((c) => ({ city: slugify(c) }))
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const resolvedParams = await params
  const cities = await getCities()
  const real = cities.find((c) => slugify(c) === resolvedParams.city)
  if (!real) {
    return {
      title: 'Cities',
      robots: { index: false, follow: false },
    }
  }

  const res = await searchPages({ city: real, limit: 1000 })
  const pages = res.data || []

  const feeNumbers = pages
    .flatMap((page: any) => String(page.fee_range || '').match(/\d[\d,]*/g) || [])
    .map((value: string) => Number(value.replace(/,/g, '')))
    .filter((value: number) => Number.isFinite(value) && value > 0)

  const courseCount = new Set(pages.map((page: any) => String(page.course || '').trim()).filter(Boolean)).size

  return generateHubMetadata('city', real, res.count, {
    minFee: feeNumbers.length ? Math.min(...feeNumbers) : 0,
    maxFee: feeNumbers.length ? Math.max(...feeNumbers) : 0,
    courseCount,
  })
}

const TOP_CITY_DESCRIPTIONS: Record<string, string> = {
  mumbai: 'Mumbai is a leading education hub with top private and government colleges across disciplines.',
  delhi: 'Delhi offers a wide range of college options with strong placement records and diverse courses.',
  bangalore: 'Bangalore is known for its strong industry connections and tech-focused colleges.',
  pune: 'Pune provides an excellent mix of traditional and modern colleges with good placement opportunities.',
  chennai: 'Chennai has reputable engineering and medical institutions with strong academic heritage.',
  hyderabad: 'Hyderabad combines research institutions with growing private colleges, offering strong industry ties.',
  kolkata: 'Kolkata features historic institutions and emerging private colleges across many courses.',
  ahmedabad: 'Ahmedabad boasts institutions with strong commerce and technical programs and growing placement outcomes.',
  lucknow: 'Lucknow has a balanced set of government and private institutions popular with local students.',
  jaipur: 'Jaipur provides affordable quality education with improving placement networks.'
}

export default async function CityHub({
  params,
  searchParams
}: {
  params: Promise<{ city: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}
  const cities = await getCities()
  const realCity = cities.find((c) => slugify(c) === resolvedParams.city)
  if (!realCity) notFound()
  const currentYear = new Date().getFullYear()

  const courseRaw = resolvedSearchParams.course
  const initialCourse = String(Array.isArray(courseRaw) ? courseRaw[0] : courseRaw || '').trim() || undefined

  const res = await searchPages({ city: realCity, limit: 1000 })
  const pages = res.data || []

  const description = TOP_CITY_DESCRIPTIONS[resolvedParams.city] || `Explore top colleges in ${realCity}. Compare fees, placements, NAAC ratings and admission steps.`

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cities', href: '/cities' },
          { label: `Best Colleges in ${realCity}` },
        ]}
      />

      <section className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Best Colleges in {realCity} for Class 12th Students {currentYear}</h1>
        <p className="mt-2 text-sm text-[#666666]">{description}</p>
      </section>

      <section>
        <CityCardsClient pages={pages} initialCourse={initialCourse} />
      </section>

    </main>
  )
}
