export function getIntroStatValue(page: any, pattern: RegExp) {
  const stats = page?.content_json?.intro?.stats || []
  const found = stats.find((s: any) => pattern.test((s?.label || '').toString()))
  return found?.value
}

export function getPlacementNumber(page: any) {
  const raw = getIntroStatValue(page, /placement/i)
  const n = Number(String(raw || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function getPackageNumber(page: any) {
  const raw = getIntroStatValue(page, /package|lpa/i)
  const n = Number(String(raw || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function getPlacementLabel(page: any) {
  const raw = getIntroStatValue(page, /placement/i)
  return raw != null ? String(raw) : 'N/A'
}

export function getPackageLabel(page: any) {
  const raw = getIntroStatValue(page, /package|lpa/i)
  return raw != null ? String(raw) : 'N/A'
}

export function getTopCollegeByType(page: any, type: 'private' | 'govt') {
  const colleges = Array.isArray(page?.content_json?.colleges) ? page.content_json.colleges : []
  const matches = colleges.filter((c: any) => {
    const t = String(c?.type || '').toLowerCase()
    if (type === 'private') return t.includes('private')
    return t.includes('govt') || t.includes('government')
  })
  return matches[0] || null
}

export function getFeaturedCollege(page: any) {
  const colleges = Array.isArray(page?.content_json?.colleges) ? page.content_json.colleges : []
  return colleges.find((c: any) => !!c?.is_featured) || colleges[0] || null
}

export function parseFeeLowerBound(feeRange: string | null | undefined) {
  const raw = String(feeRange || '')
  const nums = raw.match(/\d[\d,]*/g)
  if (!nums || !nums.length) return Number.POSITIVE_INFINITY
  return parseInt(nums[0].replace(/,/g, ''), 10)
}
