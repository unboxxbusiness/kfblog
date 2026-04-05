import { getCourses } from '../../lib/api'

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export const revalidate = 3600

export default async function BrowseCoursesPage({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = (await searchParams) || {}
  const courses = await getCourses()
  const qRaw = resolvedSearchParams.q
  const q = String(Array.isArray(qRaw) ? qRaw[0] : qRaw || '').trim().toLowerCase()
  const filteredCourses = q ? courses.filter((c) => c.toLowerCase().includes(q)) : courses

  return (
    <main className="space-y-6">
      <header className="rounded-xl bg-gradient-to-r from-[#fafafa] to-[#f5f5f5] p-8 text-[#000000]">
        <h1 className="text-3xl font-extrabold">Browse Courses</h1>
        <p className="mt-2 text-[#666666]">Explore course hubs and discover top college pages across cities.</p>
      </header>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4">
        <form action="/courses" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Filter courses..."
            className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm"
          />
          <button className="rounded-md bg-[#fca311] px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </form>
        <p className="mt-2 text-xs text-[#666666]">Showing {filteredCourses.length} of {courses.length} courses</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredCourses.map((course: string) => (
          <a key={course} href={`/courses/${slugify(course)}`} className="rounded-lg border border-[#e5e5e5] bg-white p-4 text-sm font-medium text-[#000000] shadow-sm hover:border-[#29447e] hover:text-[#14213d]">
            {course}
          </a>
        ))}
      </section>
    </main>
  )
}
