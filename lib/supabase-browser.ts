'use client';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// These environment variables are exposed to the browser because they're prefixed with NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client with the anon key for client-side operations
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
); 