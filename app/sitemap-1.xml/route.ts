import { buildCollegeSitemapEntries } from '../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../lib/sitemap-utils'

export async function GET() {
  const entries = await buildCollegeSitemapEntries(1, 1000)
  return xmlResponse(toSitemapXml(entries))
}
