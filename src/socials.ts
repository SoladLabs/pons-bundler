import type { Socials } from "./addresses.js";

function strip(value: string): string {
  return value.trim().replace(/^@/, "");
}

function asHttpUrl(value: string): string | undefined {
  if (/^https?:\/\//i.test(value)) return value;
  return undefined;
}

export function twitterUrl(value: string): string {
  const raw = strip(value);
  if (raw === "") return "";
  const full = asHttpUrl(raw);
  if (full !== undefined) return full;
  const hosted = raw.match(/^(?:www\.)?(?:x\.com|twitter\.com)\/(.+)$/i);
  if (hosted?.[1] !== undefined) return `https://x.com/${hosted[1].replace(/\/$/, "")}`;
  return `https://x.com/${raw}`;
}

export function telegramUrl(value: string): string {
  const raw = strip(value);
  if (raw === "") return "";
  const full = asHttpUrl(raw);
  if (full !== undefined) return full;
  const hosted = raw.match(/^(?:www\.)?(?:t\.me|telegram\.me)\/(.+)$/i);
  if (hosted?.[1] !== undefined) return `https://t.me/${hosted[1].replace(/\/$/, "")}`;
  return `https://t.me/${raw}`;
}

export function normalizeSocials(input?: Partial<Socials>): Socials {
  return {
    twitter: twitterUrl(input?.twitter ?? ""),
    telegram: telegramUrl(input?.telegram ?? ""),
    discord: (input?.discord ?? "").trim(),
    website: (input?.website ?? "").trim(),
    farcaster: (input?.farcaster ?? "").trim(),
  };
}
