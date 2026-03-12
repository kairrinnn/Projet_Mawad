import { handlers } from "@/auth";

// At runtime on Vercel, DATABASE_URL is the real Supabase URL (not "mock")
// so isMock will be false and the real auth handlers are used.
// During build, DATABASE_URL contains "mock" so we return dummy responses.
const isMock = !process.env.DATABASE_URL || 
               process.env.DATABASE_URL.includes("mock") || 
               process.env.BUILD_MODE === "1";

export const GET = isMock 
  ? () => new Response(JSON.stringify({ ok: true }), { status: 200 })
  : handlers.GET;

export const POST = isMock 
  ? () => new Response(JSON.stringify({ ok: true }), { status: 200 })
  : handlers.POST;
