import { NextResponse } from 'next/server'
import { getCities } from '../../../lib/api'

const RESPONSE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'X-Robots-Tag': 'noindex',
  'Cache-Control': 'public, s-maxage=3600',
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: RESPONSE_HEADERS,
  })
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS })
}

export async function GET() {
  const cities = await getCities()

  return jsonResponse({
    results: cities,
    total: cities.length,
    source: 'Kampus Filter - kampusfilter.com',
    last_updated: new Date().toISOString(),
  })
}
