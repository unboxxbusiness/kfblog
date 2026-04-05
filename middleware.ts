import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

function redirectToLogin(req: NextRequest, reason: 'unauthenticated' | 'unauthorized') {
  const url = req.nextUrl.clone()
  url.pathname = '/admin/login'
  url.searchParams.set('reason', reason)
  const res = applySecurityHeaders(NextResponse.redirect(url))
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPath = pathname === '/admin/login' || pathname.startsWith('/admin/login/')
  const isCallbackPath = pathname.startsWith('/admin/auth/callback')

  const res = applySecurityHeaders(NextResponse.next())
  const supabase = createMiddlewareClient({ req, res })

  // Refresh JWT/session on every request.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!isAdminPath) {
    return res
  }

  res.headers.set('Cache-Control', 'no-store')

  if (isCallbackPath) {
    return res
  }

  if (isLoginPath) {
    if (session?.user?.id) {
      const sessionUserId = String(session.user.id || '').trim()
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('id', sessionUserId)
        .maybeSingle()

      if (adminRow?.id) {
        const url = req.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        url.search = ''
        const redirect = applySecurityHeaders(NextResponse.redirect(url))
        redirect.headers.set('Cache-Control', 'no-store')
        return redirect
      }
    }
    return res
  }

  if (!session?.user) {
    return redirectToLogin(req, 'unauthenticated')
  }

  const userId = String(session.user.id || '').trim()
  if (!userId) {
    return redirectToLogin(req, 'unauthorized')
  }

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !adminUser?.id) {
    return redirectToLogin(req, 'unauthorized')
  }

  res.headers.set('x-admin-user-id', String(adminUser.id))
  res.headers.set('x-admin-user-email', String(adminUser.email))
  res.headers.set('x-admin-user-role', String(adminUser.role || 'admin'))

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
