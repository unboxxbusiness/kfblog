import type { NextRequest } from 'next/server'
import { getClientAddress } from './request'

type RateLimitOptions = {
  request: NextRequest
  keyPrefix: string
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitResult =
  | {
      ok: true
      remaining: number
    }
  | {
      ok: false
      retryAfterSeconds: number
    }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5_000

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }

    if (buckets.size <= Math.floor(MAX_BUCKETS * 0.8)) {
      return
    }
  }
}

export function rateLimit({ request, keyPrefix, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  pruneBuckets(now)

  const clientAddress = getClientAddress(request)
  const key = `${keyPrefix}:${clientAddress}`
  const currentBucket = buckets.get(key)

  if (!currentBucket || now >= currentBucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
    }
  }

  if (currentBucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000)),
    }
  }

  currentBucket.count += 1
  buckets.set(key, currentBucket)

  return {
    ok: true,
    remaining: Math.max(0, limit - currentBucket.count),
  }
}
