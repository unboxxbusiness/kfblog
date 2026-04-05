import { getAllPages, getCourses, getCities } from './api'
import { getCanonicalUrl } from './seo-engine'
import type { SitemapEntry } from './sitemap-utils'

const BASE_URL = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://kampusfilter.com')
  .trim()
  .replace(/\/$/, '')

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getSeoBaseUrl(): string {
  return BASE_URL
}

export async function buildCollegeSitemapEntries(chunkIndex = 0, chunkSize = 1000): Promise<SitemapEntry[]> {
  const pages = await getAllPages()
  const start = Math.max(0, chunkIndex) * chunkSize
  const end = start + chunkSize
  const chunk = pages.slice(start, end)

  return chunk
    .filter((page) => page.slug)
    .map((page) => {
      const canonical = getCanonicalUrl(String(page.slug), 'college')
      return {
        url: canonical,
        lastModified: page.updated_at || page.created_at || new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: {
            'en-IN': canonical,
          },
        },
      }
    })
}

export async function getCollegeSitemapChunkCount(chunkSize = 1000): Promise<number> {
  const pages = await getAllPages()
  return Math.max(1, Math.ceil(pages.length / chunkSize))
}

export async function buildCoursesSitemapEntries(): Promise<SitemapEntry[]> {
  const courses = await getCourses()

  return courses.map((course) => ({
    url: `${BASE_URL}/courses/${slugify(course)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 0.9,
    alternates: {
      languages: {
        'en-IN': `${BASE_URL}/courses/${slugify(course)}`,
      },
    },
  }))
}

export async function buildCitiesSitemapEntries(): Promise<SitemapEntry[]> {
  const cities = await getCities()

  return cities.map((city) => ({
    url: `${BASE_URL}/cities/${slugify(city)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 0.85,
    alternates: {
      languages: {
        'en-IN': `${BASE_URL}/cities/${slugify(city)}`,
      },
    },
  }))
}

export function buildStaticSitemapEntries(): SitemapEntry[] {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: { 'en-IN': `${BASE_URL}/` } },
    },
    {
      url: `${BASE_URL}/apply`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: { 'en-IN': `${BASE_URL}/apply` } },
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages: { 'en-IN': `${BASE_URL}/search` } },
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: { languages: { 'en-IN': `${BASE_URL}/compare` } },
    },
    {
      url: `${BASE_URL}/saved`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: { languages: { 'en-IN': `${BASE_URL}/saved` } },
    },
    {
      url: `${BASE_URL}/dashboard`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: { languages: { 'en-IN': `${BASE_URL}/dashboard` } },
    },
  ]
}
