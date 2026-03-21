import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole, isBuildPhase } from "@/lib/server/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export async function POST(request: Request) {
  if (isBuildPhase()) {
    return NextResponse.json([]);
  }

  const sessionResult = await requireRole("MANAGER");
  if ("response" in sessionResult) {
    return sessionResult.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `${sessionResult.session.user.id}/${randomUUID()}-${sanitizeFilename(file.name)}`;

    const { error } = await supabase.storage
      .from("products")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json(
        { error: "Error uploading to cloud storage. Ensure the products bucket exists." },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error uploading file" }, { status: 500 });
  }
}
