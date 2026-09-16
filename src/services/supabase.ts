import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jwlvtpnhibtmalfdcmbu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpJVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHZ0cG5oaWJ0bWFsZmRjbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI0MDUsImV4cCI6MjEwNDg1ODQwNX0.iTioT1eTznBwtEJfglyQTkgtBt8o33BFPYc0Wtg7ETI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
