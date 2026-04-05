import { buildCoursesSitemapEntries } from '../../lib/sitemap-builders'
import { toSitemapXml, xmlResponse } from '../../lib/sitemap-utils'

export async function GET() {
  const entries = await buildCoursesSitemapEntries()
  return xmlResponse(toSitemapXml(entries))
}
