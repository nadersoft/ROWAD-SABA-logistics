"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import type { Category } from "@prisma/client";
import { ImagePlusIcon, Loader2Icon, SaveIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSettingsAction } from "@/lib/settings-actions";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";

export type HomepageBackgroundInit = {
  type: string;
  solidColor: string;
  sliderImages: string[];
  sliderInterval: number;
  sliderOverlay: number;
};

const TYPE_OPTIONS = [
  { value: "gradient", label: "Gradient (current)" },
  { value: "solid", label: "Solid Color" },
  { value: "slider", label: "Image Slider" },
];

export function HomepageBackgroundSettings({ initial }: { initial: HomepageBackgroundInit }) {
  const [type, setType] = useState(initial.type);
  const [solidColor, setSolidColor] = useState(initial.solidColor || "#f4f6fa");
  const [images, setImages] = useState<string[]>(initial.sliderImages ?? []);
  const [interval, setInterval] = useState(String(initial.sliderInterval || 6));
  const [overlay, setOverlay] = useState(initial.sliderOverlay || 55);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "homepage-slider");
      try {
        const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) added.push(normalizeLogoUrl(data.url));
      } catch {
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    setUploading(false);
    if (added.length > 0) {
      setImages((prev) => [...prev, ...added]);
      toast.success(`${added.length} image(s) uploaded`);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSave() {
    const items: { key: string; value: unknown; category: Category; description: string | null }[] = [
      { key: "homepage.backgroundType", value: type, category: "APPEARANCE" as Category, description: "Homepage background type" },
      { key: "homepage.solidColor", value: solidColor, category: "APPEARANCE" as Category, description: "Homepage solid background" },
      { key: "homepage.sliderImages", value: images, category: "APPEARANCE" as Category, description: "Homepage slider images" },
      { key: "homepage.sliderInterval", value: Number(interval) || 6, category: "APPEARANCE" as Category, description: "Homepage slider interval (s)" },
      { key: "homepage.sliderOverlay", value: Number(overlay) || 55, category: "APPEARANCE" as Category, description: "Homepage slider overlay (%)" },
    ];
    startTransition(async () => {
      const res = await saveSettingsAction(items);
      if (res?.ok) toast.success("Homepage background saved");
      else toast.error("Failed to save homepage background");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage Background</CardTitle>
        <CardDescription>Choose how the landing hero renders: solid color, the brand gradient, or an image slider.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === "solid" && (
          <div className="space-y-1.5">
            <Label>Solid background color</Label>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border bg-background">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(solidColor) ? solidColor : "#f4f6fa"}
                  onChange={(e) => setSolidColor(e.target.value)}
                  className="size-12 cursor-pointer border-0 bg-transparent p-0"
                />
              </div>
              <Input value={solidColor} onChange={(e) => setSolidColor(e.target.value)} className="max-w-36 font-mono text-xs" />
            </div>
          </div>
        )}

        {type === "gradient" && (
          <p className="rounded-lg border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Uses the hero gradient start / middle / end colors from the Appearance section below.
          </p>
        )}

        {type === "slider" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <ImagePlusIcon className="size-4" />}
                {uploading ? "Uploading…" : "Upload slider images"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                multiple
                onChange={(e) => uploadFiles(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WEBP · max 5MB each · stored in /uploads/homepage-slider</p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((src, i) => (
                  <div key={`${src}-${i}`} className="group relative overflow-hidden rounded-xl border">
                    <img
                      src={src}
                      alt={`Slide ${i + 1}`}
                      className="h-24 w-full rounded-xl border bg-white object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                      aria-label="Remove slide"
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Slide interval (seconds)</Label>
                <Input
                  type="number"
                  min={2}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dark overlay — {overlay}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={overlay}
                  onChange={(e) => setOverlay(e.target.valueAsNumber)}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            </div>
          </div>
        )}

        {type === "slider" && images.length === 0 && (
          <p className="text-xs text-amber-600">No slider images yet — the gradient will be used as a fallback.</p>
        )}
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button onClick={onSave} disabled={isPending}>
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save homepage background
        </Button>
      </CardFooter>
    </Card>
  );
}