import { headers } from "next/headers";
import { handlers } from "@/auth";

const { GET: AuthGET, POST: AuthPOST } = handlers;

const isMock = !process.env.DATABASE_URL || 
               process.env.DATABASE_URL.includes("mock") || 
               process.env.DATABASE_URL.includes("dummy") || 
               process.env.BUILD_MODE === "1";

export const GET = (req: any) => {
  if (isMock) return new Response(JSON.stringify([]), { status: 200 });
  return AuthGET(req);
};

export const POST = (req: any) => {
  if (isMock) return new Response(JSON.stringify({}), { status: 200 });
  return AuthPOST(req);
};
