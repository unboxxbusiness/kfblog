import { buildCollegeSitemapEntries } from '../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../lib/sitemap-utils'

export async function GET() {
  const entries = await buildCollegeSitemapEntries(0, 1000)
  return xmlResponse(toSitemapXml(entries))
}
