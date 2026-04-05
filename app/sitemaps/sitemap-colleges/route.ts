import { buildCollegeSitemapEntries } from '../../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../../lib/sitemap-utils'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const chunk = Number(url.searchParams.get('chunk') || '0')

  const entries = await buildCollegeSitemapEntries(Number.isFinite(chunk) ? chunk : 0, 1000)
  const xml = toSitemapXml(entries)

  return xmlResponse(xml)
}
