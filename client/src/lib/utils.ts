import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Only allows internal paths ("/...") and http(s) URLs — never javascript: or data: links. */
export function safeHref(value: string | null | undefined): string | null {
  const href = (value || "").trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try { const url = new URL(href); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; } catch { return null; }
}

/** Only allows http(s) image URLs and local /images paths. */
export function safeImageUrl(value: string | null | undefined): string {
  const src = (value || "").trim();
  if (!src) return "";
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try { const url = new URL(src); return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""; } catch { return ""; }
}
