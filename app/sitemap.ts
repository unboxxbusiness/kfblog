import type { MetadataRoute } from 'next'
import { getCollegeSitemapChunkCount, getSeoBaseUrl } from '../lib/sitemap-builders'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSeoBaseUrl()
  const chunkCount = await getCollegeSitemapChunkCount(1000)
  const now = new Date()

  const collegeSitemapEntries = Array.from({ length: chunkCount }).map((_, index) => ({
    url: `${base}/sitemap-${index}.xml`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  return [
    ...collegeSitemapEntries,
    {
      url: `${base}/sitemap-courses.xml`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${base}/sitemap-cities.xml`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${base}/sitemap-static.xml`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
