import { headers } from "next/headers";
import { handlers } from "@/auth";

const { GET: AuthGET, POST: AuthPOST } = handlers;

export const GET = (req: any) => {
  if (process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1") return new Response(JSON.stringify([]), { status: 200 });
  return AuthGET(req);
};

export const POST = (req: any) => {
  if (process.env.DATABASE_URL === "mock" || process.env.BUILD_MODE === "1") return new Response(JSON.stringify({}), { status: 200 });
  return AuthPOST(req);
};
