import { createClient } from '@supabase/supabase-js'

// Import ONLY in server code (route handlers / server actions).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
