import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid crashing the app during static hosting without env vars.
  // Features that require Supabase will be no-ops.
  console.warn(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable backend features.'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
}

export { supabase };

// Test connection helper
export const testConnection = async () => {
  try {
    if (!supabase) {
      return { success: false, message: 'Supabase is not configured.' };
    }
    const { data, error } = await supabase?.from('user_profiles')?.select('count', { count: 'exact' });
    if (error) throw error;
    return { success: true, message: 'Connected to Supabase successfully' };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error?.message}` };
  }
};