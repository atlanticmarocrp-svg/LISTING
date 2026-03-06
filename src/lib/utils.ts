import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanFiveMName(name: string): string {
  if (!name) return "";
  // Remove ^0-^9 color codes
  return name.replace(/\^[0-9]/g, "").trim();
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function truncate(str: string, length: number): string {
  if (!str) return "";
  return str.length > length ? str.substring(0, length) + "..." : str;
}

// convert ISO 3166-1 alpha-2 country/region code to flag emoji
export function regionCodeToFlag(region?: string): string {
  if (!region) return "";
  // keep only letters, uppercase
  const code = region.trim().toUpperCase().slice(0, 2);
  if (code.length !== 2) return "";
  // A -> 🇦, B -> 🇧 etc by using regional indicator symbols
  const A = 0x1f1e6;
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "";
  return String.fromCodePoint(A + first, A + second);
}

// return a generic flag icon url (24x18 PNG) using flagcdn; some codes like 'EU' work as 'eu'
export function regionFlagUrl(region?: string): string | null {
  if (!region) return null;
  const code = region.trim().toLowerCase().slice(0, 2);
  if (code.length !== 2) return null;
  // flagcdn supports many ISO codes; use png format
  return `https://flagcdn.com/24x18/${code}.png`;
}

// normalize a region value or locale into a 2‑letter ISO country code
export function regionCodeFromString(region?: string, locale?: string): string | null {
  let code: string | null = null;
  if (region) {
    const match = region.trim().toUpperCase().match(/[A-Z]{2}/);
    if (match) code = match[0];
  }
  // if code is generic EU or not set, try locale
  if (locale) {
    const parts = locale.split(/[-_]/);
    let locCode: string | null = null;
    if (parts.length > 1 && /^[a-zA-Z]{2}$/.test(parts[1])) {
      locCode = parts[1].toUpperCase();
    } else if (/^[a-zA-Z]{2}$/.test(parts[0])) {
      locCode = parts[0].toUpperCase();
    }
    // prefer locale if region is missing or is the broad EU placeholder
    if (locCode && (!code || code === 'EU') && locCode !== code) {
      code = locCode;
    }
  }
  return code;
}

// Get API base URL from environment variable or use localhost fallback for development
export function getApiBaseUrl(): string {
  // In production (Vercel), VITE_BACKEND_URL will be set to the Railway URL
  // In development, it defaults to localhost:3000
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  return backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
}

// Helper function to construct full API URLs
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}
