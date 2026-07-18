/**
 * Poster image validation — MIME allowlist + magic-byte sniffing.
 * TODO(media): add virus / malware scanning before production hardening.
 */

export const POSTER_MAX_BYTES = 8 * 1024 * 1024;

export const ALLOWED_POSTER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedPosterMime = (typeof ALLOWED_POSTER_MIME_TYPES)[number];

export type PosterValidationResult =
  | {
      ok: true;
      mimeType: AllowedPosterMime;
      extension: "jpg" | "png" | "webp";
      originalName: string;
      buffer: Buffer;
    }
  | { ok: false; error: string };

const MIME_TO_EXT: Record<AllowedPosterMime, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isAllowedMime(value: string): value is AllowedPosterMime {
  return (ALLOWED_POSTER_MIME_TYPES as readonly string[]).includes(value);
}

function sniffMime(buffer: Buffer): AllowedPosterMime | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // Reject SVG / XML-looking payloads early.
  const head = buffer.subarray(0, Math.min(256, buffer.length)).toString("utf8");
  if (
    head.includes("<svg") ||
    head.includes("<SVG") ||
    head.trimStart().startsWith("<?xml")
  ) {
    return null;
  }

  return null;
}

function sanitizeOriginalName(name: string): string {
  const base = pathBasename(name).slice(0, 180).trim() || "poster";
  return base.replace(/[^\w.\u0600-\u06FF\- ()[\]]+/g, "_");
}

function pathBasename(name: string): string {
  const normalized = name.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "poster";
}

export type ValidatePosterOptions = {
  maxBytes?: number;
  tooLargeMessage?: string;
};

export async function validatePosterFile(
  file: File | null | undefined,
  options?: ValidatePosterOptions,
): Promise<PosterValidationResult> {
  const maxBytes = options?.maxBytes ?? POSTER_MAX_BYTES;
  const tooLargeMessage =
    options?.tooLargeMessage ?? "حجم پوستر نباید بیشتر از ۸ مگابایت باشد.";

  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "لطفاً یک فایل تصویر انتخاب کنید." };
  }

  if (file.size <= 0) {
    return { ok: false, error: "فایل خالی است و قابل دریافت نیست." };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: tooLargeMessage,
    };
  }

  const declared = (file.type || "").toLowerCase().trim();
  if (declared && !isAllowedMime(declared) && declared !== "application/octet-stream") {
    return {
      ok: false,
      error: "فقط تصاویر JPEG، PNG یا WebP مجاز هستند.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    return { ok: false, error: "فایل خالی است و قابل دریافت نیست." };
  }

  const sniffed = sniffMime(buffer);
  if (!sniffed) {
    return {
      ok: false,
      error: "فایل تصویر معتبر نیست. فقط JPEG، PNG یا WebP پذیرفته می‌شود.",
    };
  }

  if (declared && isAllowedMime(declared) && declared !== sniffed) {
    return {
      ok: false,
      error: "نوع فایل با محتوای آن همخوانی ندارد.",
    };
  }

  return {
    ok: true,
    mimeType: sniffed,
    extension: MIME_TO_EXT[sniffed],
    originalName: sanitizeOriginalName(file.name || "poster"),
    buffer,
  };
}
