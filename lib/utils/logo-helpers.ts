/**
 * Rebuild a public "/uploads/..." path from a Windows absolute path (D:\…\public\uploads\…)
 * so logo/favicon fields never leak the server's filesystem path.
 */
export function publicUrlFromWindowsPath(url: string): string {
  const matches = /^(?:[a-zA-Z]:[\\/].*?|(?:\\\\[^\\]+\\[^\\]+)[\\/].*?)[\\/]uploads[\\/](.+)$/i.exec(url.replace(/\\/g, "/").replace(/[\\/]{2,}/g, "/"));
  if (!matches) return "";
  return "/uploads/" + matches[1];
}

export function normalizeLogoUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Convert Google Drive view link to direct link
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  // Windows absolute path (D:\...\public\uploads\...): rebuild as a public URL.
  const windowsPath = publicUrlFromWindowsPath(url);
  if (windowsPath) return windowsPath;
  // Strip a leaked filesystem prefix more generally (C:\, D:\, UNC…) when not resolvable.
  if (/^[a-zA-Z]:[\\/]/.test(url) || /^\\\\/.test(url)) return "";
  // Always return a path starting with "/" for relative filesystem paths
  const isAbsolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.startsWith("data:");
  if (!isAbsolute && !url.startsWith("/")) {
    return "/" + url;
  }
  return url;
}

/** Build a public URL for an uploaded file: "/<folder>/<filename>". */
export function getPublicUrl(folder: string, filename: string): string {
  return `/${folder.replace(/^\/+|\/+$/g, "").replace(/^public\//, "")}/${filename}`.replace(/\/+/g, "/");
}

// Fetch an image URL and return it as a base64 data: URI for pdfmake.
// Returns null on any failure so the PDF prints without a logo.
export async function getLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  try {
    const normalized = normalizeLogoUrl(url);
    if (!normalized) return null;
    if (normalized.startsWith("data:")) return normalized;

    const fullUrl = normalized.startsWith("http")
      ? normalized
      : typeof window !== "undefined"
        ? window.location.origin + normalized
        : normalized;

    const res = await fetch(fullUrl);
    if (!res.ok) {
      console.warn("Logo load failed", url);
      return null;
    }
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Logo read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("Logo load failed", url);
    return null;
  }
}
