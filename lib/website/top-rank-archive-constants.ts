/** Shared constants / helpers for WebsiteTopRankArchive. */

import { toPersianDigits } from "@/lib/persian";

export const TOP_RANK_TITLE_MAX = 120;
export const TOP_RANK_DESCRIPTION_MAX = 2000;
export const TOP_RANK_YEAR_MIN = 1300;
export const TOP_RANK_YEAR_MAX = 1500;

export const TOP_RANK_ARCHIVE_PUBLIC_PATH = "/achievements/top-ranks" as const;
export const TOP_RANK_ARCHIVE_ADMIN_PATH =
  "/admin/website/top-rank-archive" as const;

export function defaultTopRankTitle(year: number): string {
  return `رتبه‌های برتر کنکور ${toPersianDigits(year)}`;
}

export function normalizeOptionalText(
  raw: string | null | undefined,
  max: number,
): string | null {
  const trimmed = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function parseJalaliYear(
  raw: string | number | null | undefined,
):
  | { ok: true; year: number }
  | { ok: false; error: string } {
  const value =
    typeof raw === "number"
      ? raw
      : Number.parseInt(String(raw ?? "").trim(), 10);

  if (!Number.isSafeInteger(value)) {
    return { ok: false, error: "سال شمسی باید یک عدد معتبر باشد." };
  }
  if (value < TOP_RANK_YEAR_MIN || value > TOP_RANK_YEAR_MAX) {
    return {
      ok: false,
      error: `سال شمسی باید بین ${TOP_RANK_YEAR_MIN} تا ${TOP_RANK_YEAR_MAX} باشد.`,
    };
  }
  return { ok: true, year: value };
}
