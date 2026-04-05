'use client'

import { useReportWebVitals } from 'next/web-vitals'

type VitalsPayload = {
  metric: string
  page: string
  value: number
  id: string
  navigationType: string
}

function send(payload: VitalsPayload) {
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/vitals', blob)
    return
  }

  void fetch('/api/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
}

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    send({
      metric: metric.name,
      value: metric.value,
      page: typeof window !== 'undefined' ? window.location.pathname : '/',
      id: metric.id,
      navigationType: String(metric.navigationType || ''),
    })
  })

  return null
}
