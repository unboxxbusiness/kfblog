import { NextRequest, NextResponse } from 'next/server'
import { getIndexNowKey } from '../../lib/indexnow'

async function resolveParams(params: Promise<any>) {
  return Promise.resolve(params)
}

export async function GET(_request: NextRequest, context: { params: Promise<any> }) {
  const resolved = await resolveParams(context.params)
  const requestedKey = String(resolved?.indexnowKey || '').trim()
  const activeKey = getIndexNowKey()

  if (!requestedKey || requestedKey !== activeKey) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(activeKey, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
