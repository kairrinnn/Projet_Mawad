import { createClient } from '@supabase/supabase-js';

const isBuild = !process.env.DATABASE_URL ||
               process.env.DATABASE_URL.includes("mock") ||
               process.env.BUILD_MODE === "1";

// Derive Supabase URL from DATABASE_URL if not provided
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL && !isBuild) {
  try {
    const userPart = process.env.DATABASE_URL.split('@')[0].split('//')[1];
    const projectRef = userPart.includes('.') ? userPart.split('.')[1] : null;
    if (projectRef) {
      supabaseUrl = `https://${projectRef}.supabase.co`;
    } else {
      const host = process.env.DATABASE_URL.split('@')[1]?.split('.')[0];
      if (host && !host.includes('pooler')) {
        supabaseUrl = `https://${host}.supabase.co`;
      }
    }
  } catch (e) {
    console.warn("Could not derive Supabase URL from DATABASE_URL");
  }
}

const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                 'placeholder-key';

// Safe wrapper: during build, env vars are stubs. We must not let createClient throw.
let supabase: ReturnType<typeof createClient>;
try {
  supabase = createClient(finalUrl, finalKey, { auth: { persistSession: false } });
} catch (e) {
  // Fallback stub so the import itself never crashes
  supabase = {} as unknown as ReturnType<typeof createClient>;
}

export { supabase };
