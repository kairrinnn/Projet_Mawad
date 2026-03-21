import { NextResponse } from "next/server";
import type { ZodType } from "zod";

type ParseSuccess<T> = { data: T; response?: never };
type ParseFailure = { data?: never; response: NextResponse };

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<ParseSuccess<T> | ParseFailure> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid request data",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { data: parsed.data };
}

export const cuidSchemaMessage = "Invalid identifier";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
