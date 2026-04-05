import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminResult<T> = {
  data: T | null
  error: string | null
}

function ok<T>(data: T): AdminResult<T> {
  return { data, error: null }
}

function fail<T>(message: string): AdminResult<T> {
  return { data: null, error: message }
}

export function createAdminClient(): AdminResult<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) return fail('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) return fail('Missing SUPABASE_SERVICE_ROLE_KEY')

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return ok(client)
}

export async function getAdminSession(): Promise<AdminResult<Session>> {
  try {
    const cookieStore = await cookies()
    const getCookieStore = (() => cookieStore) as unknown as () => ReturnType<typeof cookies>
    const supabase = createServerComponentClient({
      cookies: getCookieStore,
    })
    const { data, error } = await supabase.auth.getSession()

    if (error) return fail(error.message)
    if (!data.session) return fail('No active admin session')

    return ok(data.session)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to read admin session')
  }
}

export async function isAdminUser(email: string): Promise<AdminResult<boolean>> {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return fail('Email is required')

  try {
    const adminClientResult = createAdminClient()
    if (!adminClientResult.data) return fail(adminClientResult.error || 'Admin client unavailable')

    const { data, error } = await adminClientResult.data
      .from('admin_users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (error) return fail(error.message)
    return ok(Boolean(data?.id))
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to validate admin user')
  }
}

export async function getAdminUser(): Promise<AdminResult<AdminUser>> {
  try {
    const sessionResult = await getAdminSession()
    if (!sessionResult.data) return fail(sessionResult.error || 'No admin session')

    const userId = String(sessionResult.data.user.id || '').trim()
    if (!userId) return fail('Session does not include user id')

    const adminClientResult = createAdminClient()
    if (!adminClientResult.data) return fail(adminClientResult.error || 'Admin client unavailable')

    const { data, error } = await adminClientResult.data
      .from('admin_users')
      .select('id, email, name, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) return fail(error.message)
    if (!data) return fail('User is authenticated but not an admin')

    return ok(data as AdminUser)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load admin user')
  }
}
