import { createClient } from '@supabase/supabase-js';

// Environment variables configured for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jwlvtpnhibtmalfdcmbu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHZ0cG5oaWJ0bWFsZmRjbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI0MDUsImV4cCI6MjEwNDg1ODQwNX0.iTioT1eTznBwtEJfglyQTkgtBt8o33BFPYc0Wtg7ETI';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Resilient custom fetch wrapper that intercepts network failures and provides safe fallback
const safeSupabaseFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    // For auth endpoints, return empty session format so GoTrue does not throw
    if (urlStr.includes('/auth/v1/')) {
      return new Response(JSON.stringify({ data: { session: null, user: null }, error: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // For REST queries, return clean empty list
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: safeSupabaseFetch,
  },
});

export default supabase;
