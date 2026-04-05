import { getCourses } from '../lib/api'

export default async function NotFound() {
  const courses = (await getCourses()).slice(0, 8)

  return (
    <main className="mx-auto max-w-2xl rounded-xl border border-[#e5e5e5] bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-bold text-[#000000]">404 — Page not found</h1>
      <p className="mt-2 text-[#666666]">The page you are looking for may have moved or does not exist.</p>

      <form action="/search" className="mt-6 flex items-center gap-2">
        <input
          name="q"
          placeholder="Search colleges, courses, cities..."
          className="h-10 w-full rounded-md border border-[#e5e5e5] px-3 text-sm"
        />
        <button className="rounded-md bg-[#fca311] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d68502]" type="submit">
          Search
        </button>
      </form>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#666666]">Popular Courses</p>
        <div className="flex flex-wrap justify-center gap-2">
          {courses.map((course: string) => (
            <a
              key={course}
              href={`/search?q=${encodeURIComponent(course)}`}
              className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-medium text-[#333333] hover:bg-[#e5e5e5]"
            >
              {course}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
