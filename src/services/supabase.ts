import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default project credentials provided for "DG book" (Project ID: cwgyywwehgrncqphfwsi)
const DEFAULT_SUPABASE_URL = 'https://cwgyywwehgrncqphfwsi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_pamD6Tau-T1fHkfUvbli9g_mDF9scZa';

function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip REST v1 endpoint suffix if user entered the full REST endpoint
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const envUrl = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Local storage override option (allows admin to test custom Supabase credentials if desired)
const localUrl = typeof window !== 'undefined' ? cleanSupabaseUrl(localStorage.getItem('tai_dict_supabase_url') || '') : '';
const localKey = typeof window !== 'undefined' ? (localStorage.getItem('tai_dict_supabase_key') || '').trim() : '';

export const supabaseUrl = localUrl || envUrl || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = localKey || envKey || DEFAULT_SUPABASE_ANON_KEY;
export const supabaseProjectId = 'cwgyywwehgrncqphfwsi';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export function updateCustomSupabaseCredentials(url: string, key: string) {
  if (url && key) {
    localStorage.setItem('tai_dict_supabase_url', cleanSupabaseUrl(url));
    localStorage.setItem('tai_dict_supabase_key', key.trim());
    window.location.reload();
  } else {
    localStorage.removeItem('tai_dict_supabase_url');
    localStorage.removeItem('tai_dict_supabase_key');
    window.location.reload();
  }
}

