import type { NextRequest } from 'next/server'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type OriginCheckResult =
  | { ok: true }
  | {
      ok: false
      status: number
      message: string
    }

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function ensureSameOrigin(request: NextRequest): OriginCheckResult {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return { ok: true }
  }

  const expectedOrigin = request.nextUrl.origin
  const requestOrigin = request.headers.get('origin')

  if (requestOrigin) {
    return parseOrigin(requestOrigin) === expectedOrigin
      ? { ok: true }
      : { ok: false, status: 403, message: 'Invalid request origin' }
  }

  const referer = request.headers.get('referer')
  if (referer && parseOrigin(referer) === expectedOrigin) {
    return { ok: true }
  }

  return { ok: false, status: 403, message: 'Invalid request origin' }
}

export function getClientAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const value = realIp.trim()
    if (value) return value
  }

  return 'unknown'
}
