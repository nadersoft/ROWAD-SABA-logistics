import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await prisma.companyInfo.findFirst({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(info ?? {
      name: "Rowad Sabaa LOGISTICS",
      nameAr: "رواد سبأ للخدمات اللوجستية",
      headerShowLogo: true,
      headerShowCompanyName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      headerShowWebsite: false,
      footerShowTerms: true,
      footerShowBankInfo: false,
      footerShowSignature: true,
      footerShowPageNumber: true,
    });
  } catch {
    return NextResponse.json({
      name: "Rowad Sabaa LOGISTICS",
      nameAr: "رواد سبأ للخدمات اللوجستية",
      headerShowLogo: true,
      headerShowCompanyName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      headerShowWebsite: false,
      footerShowTerms: true,
      footerShowBankInfo: false,
      footerShowSignature: true,
      footerShowPageNumber: true,
    });
  }
}
