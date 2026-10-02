"use client";

import { useEffect, useState } from "react";

export type HomepageBackgroundProps = {
  type: string;
  solidColor: string;
  images: string[];
  interval: number;
  overlay: number;
};

/**
 * Renders the absolute-positioned background layer of the landing hero.
 * - solid   → flat color
 * - slider  → crossfading uploaded images + dark overlay
 * - any/gradient → brand hero gradient (current UX kit behavior)
 */
export function HomepageBackground({ type, solidColor, images, interval, overlay }: HomepageBackgroundProps) {
  const slides = (images ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (type !== "slider" || slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), Math.max(2, interval || 6) * 1000);
    return () => clearInterval(t);
  }, [type, slides.length, interval]);

  if (type === "slider" && slides.length > 0) {
    const active = idx % slides.length;
    const duration = Math.max(6, (interval || 6) * 2);
    return (
      <div className="absolute inset-0 overflow-hidden">
        {slides.map((src, i) => {
          const isActive = i === active;
          const origin = [];
          if (i % 4 === 0) origin.push("center", "center");
          if (i % 4 === 1) origin.push("left", "center");
          if (i % 4 === 2) origin.push("center", "top");
          if (i % 4 === 3) origin.push("right", "center");
          return (
            <div
              key={`${src}-${i}`}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${isActive ? "slider-kenburns" : ""}`}
              style={{
                backgroundImage: `url(${src})`,
                opacity: isActive ? 1 : 0,
                transformOrigin: origin.join(" "),
                animation: isActive ? `kenburns ${duration}s ease-out forwards` : "none",
              }}
            />
          );
        })}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(10, 22, 40, ${Math.min(100, overlay) / 100})` }} />
      </div>
    );
  }

  if (type === "solid") {
    return <div className="absolute inset-0" style={{ background: solidColor || "var(--homepage-solid)" }} />;
  }

  // Gradient (default / fallback)
  return (
    <div className="hero-bg absolute inset-0 overflow-hidden">
      <div className="absolute left-10 top-20 size-72 animate-pulse rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 size-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
    </div>
  );
}