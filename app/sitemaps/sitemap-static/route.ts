import { buildStaticSitemapEntries } from '../../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../../lib/sitemap-utils'

export async function GET() {
  const entries = buildStaticSitemapEntries()
  const xml = toSitemapXml(entries)
  return xmlResponse(xml)
}
