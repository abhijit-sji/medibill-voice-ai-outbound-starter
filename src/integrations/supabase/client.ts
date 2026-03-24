// Supabase client (Lovable)
// Note: Do not use VITE_* env vars in Lovable projects.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://qdnpztafkuprifwwqcgj.supabase.co';
// Anon/public key (safe to ship in frontend code)
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbnB6dGFma3Vwcmlmd3dxY2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTA5MTYsImV4cCI6MjA4MDM2NjkxNn0.j_3IJ8-Vm0ToK29cI5les1TQzCy_dWzi7WCqaJ-xBP8';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Enable hash fragment detection for password reset links
    flowType: 'implicit', // Changed from 'pkce' to match recovery link format (hash tokens)
  },
});
