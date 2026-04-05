import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = requestUrl.searchParams.get('next') || '/admin/dashboard'

  const cookieStore = await cookies()
  const getCookieStore = (() => cookieStore) as unknown as () => ReturnType<typeof cookies>
  const supabase = createRouteHandlerClient({
    cookies: getCookieStore,
  })

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/admin/login?reason=unauthenticated', request.url))
  }

  const sessionUserId = String(session.user.id || '').trim()

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id, email')
    .eq('id', sessionUserId)
    .maybeSingle()

  if (!adminRow?.id) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/admin/login?reason=unauthorized', request.url))
  }

  const safeNext = nextPath.startsWith('/admin') ? nextPath : '/admin/dashboard'
  return NextResponse.redirect(new URL(safeNext, request.url))
}
