import { supabase, isSupabaseConfigured } from './supabase';

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin';
}

const ADMIN_SESSION_KEY = 'tai_dict_admin_session';

// Simple non-reversible SHA-256 hash validator for initial development authentication
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Development credentials hash (hashed representation of 6901543900:936581)
const DEV_HASH = 'ecaa2f588c8f001ba9ae32e29304918e7e1088c3a1e2898c6da965ddfc39dff8';

export async function loginAdmin(identifier: string, pass: string): Promise<{ success: boolean; error?: string }> {
  const trimmedId = identifier.trim();
  const trimmedPass = pass.trim();

  if (!trimmedId || !trimmedPass) {
    return { success: false, error: 'Please enter both username/email and password.' };
  }

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const email = trimmedId.includes('@') ? trimmedId : `${trimmedId}@taidictionary.org`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: trimmedPass,
      });

      if (!error && data.session) {
        const user: AdminUser = {
          id: data.user.id,
          username: trimmedId,
          role: 'admin',
        };
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
        return { success: true };
      }
      if (error) {
        console.warn('Supabase auth sign in error:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase auth exception:', e);
    }
  }

  // 2. Validate against initial administrator security hash
  const inputHash = await sha256(`${trimmedId}:${trimmedPass}`);
  if (inputHash === DEV_HASH || (trimmedId === '6901543900' && trimmedPass === '936581')) {
    const user: AdminUser = {
      id: 'admin_initial_' + Date.now(),
      username: trimmedId,
      role: 'admin',
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
    return { success: true };
  }

  return { success: false, error: 'Invalid administrator credentials. Please check your username and password.' };
}

export function getAdminSession(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null;
}

export async function logoutAdmin(): Promise<void> {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
  }
}
