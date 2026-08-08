import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://aejkuodtljgtkwondgow.supabase.co';
const defaultKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlamt1b2R0bGpndGt3b25kZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMjg3NDgsImV4cCI6MjEwMTcwNDc0OH0.S2ngm8B0F8MV58Qc6HfAvUcBAz0E62kIBaQelQSyqv4';

function getSanitizedUrl(): string {
  let envUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  if (!envUrl) return defaultUrl;
  if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    envUrl = `https://${envUrl}`;
  }
  return envUrl;
}

function getSanitizedKey(): string {
  const envKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
  return envKey || defaultKey;
}

export const supabase = createClient(getSanitizedUrl(), getSanitizedKey());