/**
 * Registration / form FILE_UPLOAD processing — reuses MediaAsset + writeMediaFile.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES,
  type FormFileUploadAllowedMime,
  type FormFileUploadConfig,
} from "@/lib/forms/file-upload-config";
import {
  generatePrivateFormUploadStorageKey,
  writeMediaFile,
} from "@/lib/media/storage";

export const FORM_FILE_UPLOAD_METADATA_KIND = "form-file-upload" as const;

export type FormFileUploadMediaMetadata = {
  kind: typeof FORM_FILE_UPLOAD_METADATA_KIND;
  formId: string;
  formVersionId: string;
  fieldKey: string;
  purpose: string;
};

const MIME_TO_EXT: Record<FormFileUploadAllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const EXECUTABLE_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "mjs",
  "cjs",
  "vbs",
  "ps1",
  "sh",
  "bash",
  "dll",
  "jar",
  "app",
  "dmg",
  "html",
  "htm",
  "svg",
  "php",
  "asp",
  "aspx",
]);

function pathBasename(name: string): string {
  const normalized = name.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "file";
}

export function sanitizeFormUploadOriginalName(name: string): string {
  const base = pathBasename(name).slice(0, 180).trim() || "file";
  return base.replace(/[^\w.\u0600-\u06FF\- ()[\]]+/g, "_");
}

function sniffMime(buffer: Buffer): FormFileUploadAllowedMime | null {
  if (buffer.length < 5) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
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
  if (
    buffer.length >= 12 &&
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
  if (buffer.subarray(0, 5).toString("utf8") === "%PDF-") {
    return "application/pdf";
  }

  const head = buffer.subarray(0, Math.min(256, buffer.length)).toString("utf8");
  if (
    head.includes("<svg") ||
    head.includes("<SVG") ||
    head.trimStart().startsWith("<?xml") ||
    head.trimStart().startsWith("<!DOCTYPE") ||
    head.trimStart().startsWith("<html")
  ) {
    return null;
  }

  return null;
}

export type ValidateFormUploadFileResult =
  | {
      ok: true;
      mimeType: FormFileUploadAllowedMime;
      extension: string;
      originalName: string;
      buffer: Buffer;
    }
  | { ok: false; error: string };

export async function validateFormUploadFile(
  file: File | null,
  config: FormFileUploadConfig,
): Promise<ValidateFormUploadFileResult> {
  if (!file || !(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "فایلی انتخاب نشده است." };
  }

  if (file.size > config.maxBytes) {
    const mb = Math.round(config.maxBytes / (1024 * 1024));
    return {
      ok: false,
      error: `حجم فایل نباید بیشتر از ${mb} مگابایت باشد.`,
    };
  }

  const originalName = sanitizeFormUploadOriginalName(file.name || "file");
  const extensionGuess = originalName.includes(".")
    ? originalName.split(".").pop()?.toLowerCase() ?? ""
    : "";
  if (extensionGuess && EXECUTABLE_EXTENSIONS.has(extensionGuess)) {
    return { ok: false, error: "نوع فایل اجرایی مجاز نیست." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed) {
    return { ok: false, error: "نوع فایل معتبر نیست (فقط تصویر یا PDF)." };
  }

  if (!config.allowedMimeTypes.includes(sniffed)) {
    return { ok: false, error: "این نوع فایل برای این فیلد مجاز نیست." };
  }

  const claimed = (file.type || "").toLowerCase();
  if (
    claimed &&
    claimed !== sniffed &&
    !(claimed === "image/jpg" && sniffed === "image/jpeg")
  ) {
    // Prefer sniffed bytes over client Content-Type.
  }

  return {
    ok: true,
    mimeType: sniffed,
    extension: MIME_TO_EXT[sniffed],
    originalName,
    buffer,
  };
}

export function buildFormFileUploadMetadata(params: {
  formId: string;
  formVersionId: string;
  fieldKey: string;
  purpose?: string;
}): FormFileUploadMediaMetadata {
  return {
    kind: FORM_FILE_UPLOAD_METADATA_KIND,
    formId: params.formId,
    formVersionId: params.formVersionId,
    fieldKey: params.fieldKey,
    purpose: params.purpose?.trim() || "registration-document",
  };
}

export function formFileUploadMetadataToJson(
  metadata: FormFileUploadMediaMetadata,
): Prisma.InputJsonObject {
  return metadata as unknown as Prisma.InputJsonObject;
}

export function isFormFileUploadMetadata(
  value: unknown,
): value is FormFileUploadMediaMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.kind === FORM_FILE_UPLOAD_METADATA_KIND &&
    typeof record.formId === "string" &&
    typeof record.formVersionId === "string" &&
    typeof record.fieldKey === "string"
  );
}

export async function writeValidatedFormUpload(params: {
  validated: Extract<ValidateFormUploadFileResult, { ok: true }>;
}): Promise<{ storageKey: string; byteSize: number; checksum: string }> {
  const storageKey = generatePrivateFormUploadStorageKey(
    params.validated.extension,
  );
  const written = await writeMediaFile({
    storageKey,
    data: params.validated.buffer,
  });
  return {
    storageKey,
    byteSize: written.byteSize,
    checksum: written.checksum,
  };
}

/** Auth-gated download path for a registration MediaAsset (secure reference). */
export function formUploadSecureDownloadPath(mediaAssetId: string): string {
  return `/admin/forms/media/${mediaAssetId}/download`;
}

export function defaultAllowedMimeLabelList(): string {
  return FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES.join(", ");
}
