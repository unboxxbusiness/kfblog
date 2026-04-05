export type SitemapEntry = {
  url: string
  lastModified?: string | Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  alternates?: {
    languages?: Record<string, string>
  }
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeDate(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function toSitemapXml(entries: SitemapEntry[]): string {
  const rows = entries
    .map((entry) => {
      const alternates = entry.alternates?.languages || {}
      const links = Object.entries(alternates)
        .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}" />`)
        .join('\n')

      return [
        '  <url>',
        `    <loc>${escapeXml(entry.url)}</loc>`,
        `    <lastmod>${escapeXml(normalizeDate(entry.lastModified))}</lastmod>`,
        entry.changeFrequency ? `    <changefreq>${entry.changeFrequency}</changefreq>` : '',
        typeof entry.priority === 'number' ? `    <priority>${entry.priority.toFixed(1)}</priority>` : '',
        links,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    rows,
    '</urlset>',
  ].join('\n')
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
