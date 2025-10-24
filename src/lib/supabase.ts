import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if we have real Supabase credentials
const isSupabaseConfigured = supabaseUrl && 
                            supabaseAnonKey && 
                            supabaseUrl.startsWith('https://') &&
                            supabaseAnonKey.startsWith('eyJ')

// Debug logging
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING')
console.log('Is Supabase configured:', isSupabaseConfigured)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Export a flag to check if Supabase is properly configured
export const isSupabaseReady = isSupabaseConfigured

// Database types
export interface Player {
  id: string
  name: string
  email?: string
  created_at: string
  total_score: number
}

export interface DailyScore {
  id: string
  player_id: string
  day: number
  score: number
  questions_answered: number
  accuracy_percentage: number
  created_at: string
}

export interface Answer {
  id: string
  player_id: string
  question_id: number
  day: number
  answer: string
  is_correct: boolean
  time_taken: number
  points_earned: number
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  name: string
  total_score: number
  rank: number
}
