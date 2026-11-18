import type { SalesCommandDocumentFile } from "@/lib/sales-command/salesCommandDocumentTypes";

export function getYouTubeVideoId(url: string | null): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  if (raw.toLowerCase().includes("youtube.com/watch?v=")) {
    const m = raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  if (raw.toLowerCase().includes("youtu.be/")) {
    const m = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  return null;
}

export function fileTypeLabel(file: SalesCommandDocumentFile): string {
  if (file.external_url) {
    const url = file.external_url.toLowerCase();
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "VIDEO";
    return "LINK";
  }
  const content = (file.content_type || "").toLowerCase();
  const filename = (file.filename || "").toLowerCase();
  if (content.includes("pdf") || filename.endsWith(".pdf")) return "PDF";
  if (content.includes("video") || /\.(mp4|mov|webm|m4v)$/.test(filename)) return "VIDEO";
  if (content.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(filename)) return "IMAGE";
  const extMatch = filename.match(/\.([a-z0-9]{1,6})$/i);
  if (extMatch) return extMatch[1].toUpperCase();
  return "FILE";
}

export function fileTypeIcon(label: string): string {
  switch (label) {
    case "PDF":
      return "📄";
    case "VIDEO":
      return "🎬";
    case "LINK":
      return "🔗";
    case "IMAGE":
      return "🖼️";
    default:
      return "📎";
  }
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || name;
}
