import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://aejkuodtljgtkwondgow.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlamt1b2R0bGpndGt3b25kZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjg3NDgsImV4cCI6MjEwMTcwNDc0OH0.S2ngm8B0F8MV58Qc6HfAvUcBAz0E62kIBaQelQSyqv4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);