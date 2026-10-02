## Path Conflict Check - 08/23/2026 02:26:56

### 1- Both settings dirs exist?

Path                                                         Length
----                                                         ------
app\(dashboard)\settings\page.tsx                              2830
app\(dashboard)\admin\settings\registration-builder                
app\(dashboard)\admin\settings\page.tsx                        1682
app\(dashboard)\admin\settings\registration-builder\page.tsx   2963




### 2- Settings page content (first 800 chars each)

--- app\(dashboard)\settings\page.tsx ---
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getAllSettings, getSettingOr } from "@/lib/settings";
import { toSettingMap } from "@/lib/theme";
import { buildSettingsSections } from "@/lib/settings-config";
import { SettingsEditor } from "@/components/settings/settings-editor";
import { MasterDataPicker } from "@/components/settings/master-data-picker";
import { DEFAULT_SURCHARGES } from "@/lib/calculation";
import { getActiveCountries, getActivePorts, getActiveCurrencies } from "@/lib/data/get-active-data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, ports, countries, currencies] = await Promise.all([
    getAllSettings(),
    getActivePorts(),
    getActiveCountries(),
    getActiveCur

--- app\(dashboard)\admin\settings\registration-builder\page.tsx ---
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationBuilder } from "@/components/admin/registration-builder";

export const dynamic = "force-dynamic";

export default async function RegistrationBuilderPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const pageConfig = await prisma.registrationPageConfig.findUnique({ where: { id: "default" } });
  const fields = await prisma.registrationFieldConfig.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registrat

--- app\(dashboard)\admin\settings\page.tsx ---
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MasterData } from "@/components/admin/master-data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const [countries, ports, currencies] = await Promise.all([
    prisma.country.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { ports: true } } },
    }),
    prisma.port.findMany({ orderBy: { name: "asc" }, include: { country: true } }),
    prisma.currency.findMany({ orderBy: [{ isDefault: "desc" }, { code: "asc" }] }),
  ]);

  return (
  

### 3- lib/actions used by settings pages

Path                                                         Line                                                                                              
----                                                         ----                                                                                              
app\(dashboard)\settings\page.tsx                            import { getAllSettings, getSettingOr } from "@/lib/settings";                                    
app\(dashboard)\settings\page.tsx                                getAllSettings(),                                                                             
app\(dashboard)\admin\settings\registration-builder\page.tsx import { prisma } from "@/lib/prisma";                                                            
app\(dashboard)\admin\settings\registration-builder\page.tsx   const pageConfig = await prisma.registrationPageConfig.findUnique({ where: { id: "default" } });
app\(dashboard)\admin\settings\registration-builder\page.tsx   const fields = await prisma.registrationFieldConfig.findMany({                                  
app\(dashboard)\admin\settings\page.tsx                      import { prisma } from "@/lib/prisma";                                                            
app\(dashboard)\admin\settings\page.tsx                          prisma.country.findMany({                                                                     
app\(dashboard)\admin\settings\page.tsx                          prisma.port.findMany({ orderBy: { name: "asc" }, include: { country: true } }),               
app\(dashboard)\admin\settings\page.tsx                          prisma.currency.findMany({ orderBy: [{ isDefault: "desc" }, { code: "asc" }] }),              




### 4- API/settings routes

--- api/public/settings/route.ts ---
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


--- admin/settings/page.tsx (first 500) ---
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MasterData } from "@/components/admin/master-data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const [countries, ports, currencies] = await Promise.all([
    prisma.coun

--- dashboard/settings/page.tsx ---
export const dynamic = "force-dynamic";
import Link from "next/link";
import { getAllSettings, getSettingOr } from "@/lib/settings";
import { toSettingMap } from "@/lib/theme";
import { buildSettingsSections } from "@/lib/settings-config";
import { SettingsEditor } from "@/components/settings/settings-editor";
import { MasterDataPicker } from "@/components/settings/master-data-picker";
import { DEFAULT_SURCHARGES } from "@/lib/calculation";
import { getActiveCountries, getActivePorts, getActiveCurrencies } from "@/lib/data/get-active-data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, ports, countries, currencies] = await Promise.all([
    getAllSettings(),
    getActivePorts(),
    getActiveCountries(),
    getActiveCurrencies(),
  ]);

  const sections = buildSettingsSections();

  const map = toSettingMap(settings);
  const surcharges = await getSettingOr("pricing.surcharges", DEFAULT_SURCHARGES);

  const values: Record<string, string | number | boolean | Record<string, number>> = {};
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === "surcharges") {
        values[field.key] = { ...DEFAULT_SURCHARGES, ...(surcharges as object) };
      } else {
        values[field.key] = (map[field.key] as string | number | boolean) ?? "";
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Everything here lives in the database â€” zero hardcoded config. Changes apply instantly.
        </p>
      </div>
      <div className="rounded-lg border bg-blue-50 p-4 text-sm">
        <p className="font-medium text-blue-900">Company logos, identity and document settings</p>
        <p className="mt-1 text-blue-700">
          Company logos (website, PDF, favicon), contact info, and document headers/footers are now managed in{" "}
          <Link href="/admin/document-builder" className="underline font-medium hover:text-blue-900">
            Document Builder
          </Link>.
        </p>
      </div>
      <MasterDataPicker
        countries={countries.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        ports={ports.map((p) => ({ id: p.id, code: p.code, name: p.name, countryId: p.countryId }))}
        currencies={currencies.map((c) => ({ id: c.id, code: c.code, name: c.name, isDefault: c.isDefault }))}
        currentCountryCode={String(map["defaults.originCountryCode"] ?? "SA")}
        currentPortCode={String(map["defaults.originPortCode"] ?? "JED")}
        currentCurrency={String(map["defaults.currency"] ?? "SAR")}
      />
      <SettingsEditor sections={sections} values={values} />
    </div>
  );
}


### 5- lib/settings & lib/actions files

Path                       
----                       
lib\actions\company-info.ts
lib\settings-actions.ts    
lib\settings-config.ts     
lib\settings.ts            




### 6- lib files referencing SystemSetting/CompanyInfo

Count File                       
----- ----                       
   14 lib\actions\company-info.ts
    5 lib\settings.ts            
    4 lib\theme.ts               
    2 lib\integrations.ts        
    2 lib\actions\system.ts      
    1 lib\rate-limit.ts          
    1 lib\otp.ts                 
    1 lib\actions\currencies.ts  
    1 lib\actions\backup.ts      
    1 lib\integration-keys.ts    
    1 lib\calculation.ts         
    1 lib\notify.ts              
    1 lib\log.ts                 




--- END ---
