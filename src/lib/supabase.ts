import { createClient } from '@supabase/supabase-js'

const isBuild = !process.env.DATABASE_URL || 
               process.env.DATABASE_URL.includes("mock") || 
               process.env.BUILD_MODE === "1";

// Derive Supabase URL from DATABASE_URL if not provided
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL && !isBuild) {
  try {
    // For Supabase, the user is often "postgres.[PROJECT_REF]"
    const userPart = process.env.DATABASE_URL.split('@')[0].split('//')[1];
    const projectRef = userPart.includes('.') ? userPart.split('.')[1] : null;
    
    if (projectRef) {
      supabaseUrl = `https://${projectRef}.supabase.co`;
    } else {
      // Fallback to host parsing if username doesn't contain project ref
      const host = process.env.DATABASE_URL.split('@')[1]?.split('.')[0];
      if (host && !host.includes('pooler')) {
        supabaseUrl = `https://${host}.supabase.co`;
      }
    }
  } catch (e) {
    console.warn("Could not derive Supabase URL from DATABASE_URL");
  }
}

// Fallbacks for build phase to prevent crashes
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://placeholder.supabase.co';

// Use Service Role Key if available (better for server-side uploads), otherwise Anon key
const finalKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);
