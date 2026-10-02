import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { getPublicUrl } from "@/lib/utils/logo-helpers";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * All upload destinations are under public/. The API always returns a public
 * "/uploads/..." URL — never an absolute filesystem path (D:\…).
 */
const TARGET_FOLDERS: Record<string, string> = {
  company: "public/uploads/company",
  carrier: "public/uploads/carriers",
  website: "public/uploads/website",
  "homepage-slider": "public/uploads/homepage-slider",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "company";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, SVG, WEBP allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = TARGET_FOLDERS[type] ?? TARGET_FOLDERS.company;

    const uploadDir = path.join(process.cwd(), folder);
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".png";
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}${ext}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const publicUrl = getPublicUrl(folder, filename);

    return NextResponse.json({ url: publicUrl, filename });
  } catch (e) {
    console.error("Upload error", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
