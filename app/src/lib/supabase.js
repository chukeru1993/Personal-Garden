import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim()

export const isSupabaseConfigured = Boolean(url && key)
export const demoMode = !isSupabaseConfigured
export const ownerEmail = (import.meta.env.VITE_OWNER_EMAIL || '').trim()

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
