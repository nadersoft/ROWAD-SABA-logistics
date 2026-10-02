"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";
import type { Locale } from "@/lib/i18n";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Live Tracking", href: "#tracking" },
  { label: "Why Us", href: "#whyus" },
  { label: "Contact", href: "#contact" },
];

export function Navbar({ companyName, logoUrl, cta, locale, heroSolid = false }: { companyName: string; logoUrl?: string | null; cta: string; locale: Locale; heroSolid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const normalizedLogo = logoUrl ? normalizeLogoUrl(logoUrl) : "";
  const showLogo = !!normalizedLogo && !imgError;

  const brandTokens = companyName.split(/\s+/).filter(Boolean);
  const brandName = (brandTokens.length > 1 ? brandTokens.slice(0, -1).join(" ") : brandTokens[0] ?? "ALOLA").toUpperCase();

  useEffect(() => {
    setImgError(false);
  }, [normalizedLogo]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Solid hero backgrounds are light → dark navbar foreground from the start.
  const dark = scrolled || heroSolid;

  const linkCls = dark
    ? "text-gray-600 hover:text-[var(--primary)]"
    : "text-white/90 hover:text-white";

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-panel shadow-lg" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <div className={`flex size-12 items-center justify-center rounded-xl p-0.5 ring-1 ring-black/5 shadow-md shadow-black/20 backdrop-blur-sm ${showLogo ? "bg-white/60" : "bg-[var(--primary)]"}`}>
              {showLogo ? (
                <img
                  src={normalizedLogo}
                  alt={companyName}
                  onError={() => setImgError(true)}
                  className="size-11 rounded-lg object-contain"
                />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-lg text-lg font-bold text-[var(--primary-foreground)]">
                  RSL
                </div>
              )}
            </div>
            <div>
              <div className={`text-xl font-bold tracking-tight ${dark ? "text-[var(--alola-dark)]" : "text-white"}`}>
                {brandName}
              </div>
              <div className={`text-[10px] uppercase tracking-widest ${dark ? "text-[var(--primary)]" : "text-white/70"}`}>
                Logistics
              </div>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className={`text-sm font-medium transition-colors ${linkCls}`}>
                {l.label}
              </a>
            ))}
            <LocaleSwitcher locale={locale} />
            <Link
              href="/login"
              className={`text-sm font-semibold transition-all ${
                dark ? "text-[var(--primary)] hover:text-[var(--accent)]" : "text-white/90 hover:text-white"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/quote"
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/25 transition-all hover:bg-[var(--accent)]"
            >
              {cta}
              <ArrowRight className="size-4" />
            </Link>
          </div>

            <div className="flex items-center gap-3 md:hidden">
              <LocaleSwitcher locale={locale} />
              <button
                className="p-2"
                onClick={() => setOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {open ? (
                  <X className={`size-6 ${dark ? "text-[var(--alola-dark)]" : "text-white"}`} />
                ) : (
                  <Menu className={`size-6 ${dark ? "text-[var(--alola-dark)]" : "text-white"}`} />
                )}
              </button>
            </div>
        </div>
      </div>

      {open && (
        <div className="glass-panel overflow-hidden border-t md:hidden">
          <div className="space-y-3 px-4 py-4">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block w-full rounded-lg px-4 py-3 text-left font-medium text-gray-700 hover:bg-[var(--alola-slate)]"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/quote"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white"
            >
              {cta}
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block w-full rounded-xl border px-4 py-3 text-center font-semibold text-[var(--primary)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
