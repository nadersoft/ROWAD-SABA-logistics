import { NextResponse } from "next/server";
import { getSettingOr } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [whatsapp, email] = await Promise.all([
      getSettingOr<string>("floating_whatsapp_number", "967700000000"),
      getSettingOr<string>("content.contact.email", "quotes@alola-logistics.com"),
    ]);
    return NextResponse.json({ whatsapp, email });
  } catch {
    return NextResponse.json({ whatsapp: "967700000000", email: "quotes@alola-logistics.com" });
  }
}
