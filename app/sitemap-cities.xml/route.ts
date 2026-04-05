import { buildCitiesSitemapEntries } from '../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../lib/sitemap-utils'

export async function GET() {
  const entries = await buildCitiesSitemapEntries()
  return xmlResponse(toSitemapXml(entries))
}
