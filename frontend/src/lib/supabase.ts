import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Photo {
  id: string
  title: string
  description: string | null
  country: string
  latitude: number | null
  longitude: number | null
  taken_date: string | null
  file_path: string
  file_url: string
  user_id: string | null
  created_at: string
  updated_at: string
}

 