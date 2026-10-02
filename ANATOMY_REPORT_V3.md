## Anatomy Report - 08/23/2026 02:11:49

### 1- .env Files

Name                 Length LastWriteTime        
----                 ------ -------------        
.env                    986 8/17/2026 10:03:02 PM
.env.example            582 8/20/2026 10:33:03 PM
.env.hostinger.ready    503 8/22/2026 12:52:17 AM
.env.production         617 8/22/2026 1:09:31 AM 




--- .env ---
# --- Database (Cloud Mode: Supabase / Neon) ---
DATABASE_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# --- Docker Compose (if you use local docker instead) ---
# DATABASE_URL="postgresql://alola:alola_dev@localhost:5432/alola_dev"
POSTGRES_USER=alola
POSTGRES_

--- .env.example ---
# === DATABASE (Supabase) ===
# Pooled connection (for Prisma - use port 6543)
DATABASE_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Direct connection (for migrations - use port 5432)
DIRECT_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# === AUTH ===
NEXTAUTH_URL="https://alolalogistics.com"
NEXTAUTH_SECRET="REPLACE_WITH_RANDOM_32_C

--- .env.hostinger.ready ---
# === Auto-generated for Hostinger - 2026-08-21T21:52:17.234Z ===
DATABASE_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
AUTH_SECRET="REDACTED_SECRET"
NEXTAUTH_URL="http://localhost:3101"
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="

--- .env.production ---
# === Auto-generated for Hostinger ===
DATABASE_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.seneyckqwoidcygmrhbb:REDACTED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
AUTH_SECRET="REDACTED_SECRET"
NEXTAUTH_SECRET="REDACTED_SECRET"
NEXTAUTH_URL="https://alolalogistics.com"
NEXT_P

### 2- schema.prisma - Settings Models

> prisma\schema.prisma:531:model SystemSetting {
  prisma\schema.prisma:532:  key         String    @id
  prisma\schema.prisma:533:  value       Json
  prisma\schema.prisma:534:  category    Category
  prisma\schema.prisma:535:  description String?
  prisma\schema.prisma:536:  updatedById String?
> prisma\schema.prisma:544:model RegistrationPageConfig {
  prisma\schema.prisma:545:  id                       String   @id @default(cuid())
  prisma\schema.prisma:546:  pageTitleAr              String
  prisma\schema.prisma:547:  pageTitleEn              String
  prisma\schema.prisma:548:  pageSubtitleAr           String?
  prisma\schema.prisma:549:  pageSubtitleEn           String?
> prisma\schema.prisma:564:model RegistrationFieldConfig {
  prisma\schema.prisma:565:  id                String   @id @default(cuid())
  prisma\schema.prisma:566:  fieldKey          String   @unique
  prisma\schema.prisma:567:  labelAr           String
  prisma\schema.prisma:568:  labelEn           String
  prisma\schema.prisma:569:  placeholderAr     String?
> prisma\schema.prisma:683:model CmsItem {
  prisma\schema.prisma:684:  id            String   @id @default(cuid())
  prisma\schema.prisma:685:  sectionId     String
  prisma\schema.prisma:686:  slug          String
  prisma\schema.prisma:687:  icon          String   @default("package")
  prisma\schema.prisma:688:  titleAr       String
> prisma\schema.prisma:808:model CompanyInfo {
  prisma\schema.prisma:809:  id                   String   @id @default(cuid())
  prisma\schema.prisma:810:  name                 String   @default("ALOLA LOGISTICS")
  prisma\schema.prisma:811:  nameAr               String?  @default("ألولا للخدمات اللوجستية")
  prisma\schema.prisma:812:  logoUrl              String?
  prisma\schema.prisma:813:  logoForPdfUrl        String?
> prisma\schema.prisma:842:model DocumentTemplate {
  prisma\schema.prisma:843:  id             String   @id @default(cuid())
  prisma\schema.prisma:844:  type           String   @unique
  prisma\schema.prisma:845:  name           String
  prisma\schema.prisma:846:  nameAr         String?
  prisma\schema.prisma:847:  isActive       Boolean  @default(true)
> prisma\schema.prisma:857:model WebsitePage {
  prisma\schema.prisma:858:  id             String   @id @default(cuid())
  prisma\schema.prisma:859:  slug           String   @unique
  prisma\schema.prisma:860:  title          String
  prisma\schema.prisma:861:  titleAr        String?
  prisma\schema.prisma:862:  isActive       Boolean  @default(true)
> prisma\schema.prisma:871:model WebsiteSection {
  prisma\schema.prisma:872:  id        String   @id @default(cuid())
  prisma\schema.prisma:873:  pageId    String
  prisma\schema.prisma:874:  type      String
  prisma\schema.prisma:875:  order     Int
  prisma\schema.prisma:876:  isVisible Boolean  @default(true)




### 3- Settings Pages (directories)

FullName                                              
--------                                              
D:\ROWAD-SABA-logistics\app\(dashboard)\settings      
D:\ROWAD-SABA-logistics\app\(dashboard)\admin\settings
D:\ROWAD-SABA-logistics\app\api\public\settings       




### 4- Logo/AppName Source

Line                                                                                          
----                                                                                          
import { getAllSettings } from "@/lib/settings";                                              
import { getCompanyInfoSafe } from "@/lib/actions/company-info";                              
  const [settings, companyInfo] = await Promise.all([getAllSettings(), getCompanyInfoSafe()]);
  const map = toSettingMap(settings);                                                         
  const favicon = companyInfo?.faviconUrl || "/favicon.ico";                                  
  const settings = await getAllSettings();                                                    
  const theme = buildTheme(settings);                                                         
  const map = toSettingMap(settings);                                                         




### 5- Hard-coded 'alola' references

### 6- process.env.NEXT_PUBLIC usage

--- END ---

### 5- Hard-coded 'alola' references

File                                         LineNumber Line                                                                                                                                            
----                                         ---------- ----                                                                                                                                            
app\(auth)\auth\register\page.tsx                    23   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\(auth)\login\page.tsx                            24   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\(auth)\layout.tsx                                11   const whatsappMessage = getString(map, "floating_whatsapp_message", "Hello Alola, I have a shipping inquiry.") || getString(map,              
                                                        "appearance.floatingWhatsappMessage", "Hello Alola, I have a shipping inquiry.");                                                               
app\(dashboard)\dashboard\new-quote\page.tsx         30   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\(dashboard)\invoices\[id]\page.tsx               28   const company = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                            
app\(dashboard)\quotes\[id]\page.tsx                 43   const company = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                            
app\(dashboard)\layout.tsx                           25   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\(dashboard)\layout.tsx                           26   const cookieLocale = cookies().get("alola_locale")?.value;                                                                                    
app\api\company-info\route.ts                        10       name: "ALOLA LOGISTICS",                                                                                                                  
app\api\company-info\route.ts                        25       name: "ALOLA LOGISTICS",                                                                                                                  
app\api\public\settings\route.ts                     10       getSettingOr<string>("content.contact.email", "quotes@alola-logistics.com"),                                                              
app\api\public\settings\route.ts                     14     return NextResponse.json({ whatsapp: "967700000000", email: "quotes@alola-logistics.com" });                                                
app\quote\page.tsx                                   28   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\track\[ref]\page.tsx                             59   const cookieLocale = cookies().get("alola_locale")?.value;                                                                                    
app\track\[ref]\page.tsx                             85     <main className="min-h-screen bg-[var(--alola-slate)] px-4 py-10 text-gray-800 sm:px-6">                                                    
app\track\[ref]\page.tsx                            103                   <h1 className="text-xl font-bold text-[var(--alola-dark)] sm:text-2xl">                                                       
app\track\[ref]\page.tsx                            120                 <div className="text-lg font-bold text-[var(--alola-dark)]">                                                                    
app\track\[ref]\page.tsx                            161                             <h4 className={`font-semibold ${m.completed || m.current ? "text-[var(--alola-dark)]" : "text-gray-400"}`}>         
app\track\[ref]\page.tsx                            189               <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--alola-dark)]">                                           
app\layout.tsx                                       28   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\layout.tsx                                       43   const cookieLocale = cookies().get("alola_locale")?.value;                                                                                    
app\layout.tsx                                       97     whatsappMessage: str("floating_whatsapp_message", "appearance.floatingWhatsappMessage", "Hello Rowad Sabaa Logistics, I need a quote."),          
app\not-found.tsx                                     6     <main className="flex min-h-screen items-center justify-center bg-[var(--alola-slate)] px-4 text-center text-gray-800">                     
app\not-found.tsx                                    11         <h1 className="text-6xl font-bold tracking-tight text-[var(--alola-dark)]">404</h1>                                                     
app\not-found.tsx                                    12         <p className="mt-4 text-lg font-semibold text-[var(--alola-dark)]">Page not found</p>                                                   
app\not-found.tsx                                    26             className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold text-[var(--primary)] transition-all                        
                                                        hover:bg-[var(--alola-slate)]"                                                                                                                  
app\page.tsx                                         29   const cookieLocale = cookies().get("alola_locale")?.value;                                                                                    
app\page.tsx                                         31   const companyName = getString(map, "company.name", "Rowad Sabaa Logistics");                                                                        
app\page.tsx                                         44   const email = getString(map, "content.contact.email", "hello@rowadsabaa.com");                                                                     
app\page.tsx                                         46   const whatsappMessage = getString(map, "floating_whatsapp_message", "Hello Alola, I have a shipping inquiry.") || getString(map,              
                                                        "appearance.floatingWhatsappMessage", "Hello Alola, I have a shipping inquiry.");                                                               




### 6- process.env.NEXT_PUBLIC usage

Count File
----- ----
    1     




--- END ---
