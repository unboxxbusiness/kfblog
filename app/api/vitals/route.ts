import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '../../../lib/admin-auth'
import { logCronEvent } from '../../../lib/cron-logger'

const metricSchema = z.object({
  metric: z.string().trim().min(1).max(20),
  page: z.string().trim().min(1).max(400),
  value: z.number().finite(),
  id: z.string().trim().max(120).optional(),
  navigationType: z.string().trim().max(60).optional(),
})

function isAlert(metric: string, value: number): boolean {
  const upper = metric.toUpperCase()
  if (upper === 'LCP' && value > 4000) return true
  if (upper === 'CLS' && value > 0.25) return true
  if (upper === 'INP' && value > 500) return true
  return false
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = metricSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 400 })
  }

  const payload = parsed.data
  const alert = isAlert(payload.metric, payload.value)
  const createdAt = new Date().toISOString()

  const adminClientResult = createAdminClient()

  if (adminClientResult.data) {
    const { error } = await adminClientResult.data.from('vitals').insert({
      metric: payload.metric,
      page: payload.page,
      value: payload.value,
      metric_id: payload.id || null,
      navigation_type: payload.navigationType || null,
      is_alert: alert,
      created_at: createdAt,
    })

    if (error) {
      await logCronEvent({
        job: 'web-vitals',
        status: 'error',
        message: 'Failed to write web vitals row',
        details: {
          metric: payload.metric,
          page: payload.page,
          error: error.message,
        },
      })
    }
  }

  if (alert) {
    await logCronEvent({
      job: 'web-vitals-alert',
      status: 'error',
      message: 'Core Web Vitals threshold exceeded',
      details: {
        metric: payload.metric,
        page: payload.page,
        value: payload.value,
      },
    })
  }

  return NextResponse.json({ ok: true, alert }, { status: 202 })
}
