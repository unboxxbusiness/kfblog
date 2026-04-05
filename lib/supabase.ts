import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')

    const parsed = JSON.parse(decoded)
    return typeof parsed?.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment')
}

if (decodeJwtRole(SUPABASE_ANON_KEY) === 'service_role') {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be an anon key, not a service role key')
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

export async function getAllPublishedSlugs(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('pages').select('slug').eq('published', true)
    if (error) {
      console.error('[getAllPublishedSlugs] supabase error', error.message)
      return []
    }
    return (data || []).map((r: any) => r.slug).filter(Boolean)
  } catch (err) {
    console.error('[getAllPublishedSlugs] unexpected error', err)
    return []
  }
}
