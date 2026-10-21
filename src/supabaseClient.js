import { createClient } from '@supabase/supabase-js'

// Supabase 인프라 연결 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://guoswbxavlkygcmvxkua.supabase.co'

// Supabase anon key (또는 Publishable Key)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3N3YnhhdmxreWdjbXZ4a3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Njc2NDUsImV4cCI6MjEwODA0MzY0NX0.WpNVql9H8oct9KkaDHW7s1jD7phaXlyjtCjU-TVo5tk'

// Publishable Key 참조
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_aBcugbzzE0JMNiTbm1uNyQ_BbR46W1H'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
