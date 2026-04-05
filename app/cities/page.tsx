import { getCities } from '../../lib/api'

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export const revalidate = 3600

export default async function BrowseCitiesPage({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = (await searchParams) || {}
  const cities = await getCities()
  const qRaw = resolvedSearchParams.q
  const q = String(Array.isArray(qRaw) ? qRaw[0] : qRaw || '').trim().toLowerCase()
  const filteredCities = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Browse Cities</h1>
        <p className="mt-2 text-[#666666]">Explore city hubs and compare courses, fees, and placement opportunities.</p>
      </header>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
        <form action="/cities" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Filter cities..."
            className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm"
          />
          <button className="rounded-md bg-[#fca311] px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </form>
        <p className="mt-2 text-xs text-[#666666]">Showing {filteredCities.length} of {cities.length} cities</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredCities.map((city: string) => (
          <a key={city} href={`/cities/${slugify(city)}`} className="rounded-lg border border-[#e5e5e5] bg-white p-4 text-sm font-medium text-[#000000] shadow-sm hover:border-[#29447e] hover:text-[#14213d]">
            {city}
          </a>
        ))}
      </section>
    </main>
  )
}
