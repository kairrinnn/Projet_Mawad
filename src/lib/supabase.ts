import { createClient } from '@supabase/supabase-js'

const isBuild = !process.env.DATABASE_URL || 
               process.env.DATABASE_URL.includes("mock") || 
               process.env.BUILD_MODE === "1";

// Derive Supabase URL from DATABASE_URL if not provided
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL && !isBuild) {
  try {
    const host = process.env.DATABASE_URL.split('@')[1]?.split('.')[0];
    if (host) supabaseUrl = `https://${host}.supabase.co`;
  } catch (e) {
    console.warn("Could not derive Supabase URL from DATABASE_URL");
  }
}

// Fallbacks for build phase to prevent crashes
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);
