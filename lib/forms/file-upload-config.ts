/**
 * FormField.config.upload contract for FormFieldType.FILE_UPLOAD.
 */

export const FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
export const FORM_FILE_UPLOAD_HARD_MAX_BYTES = 10 * 1024 * 1024;
export const FORM_FILE_UPLOAD_DEFAULT_MAX_FILES = 1;
export const FORM_FILE_UPLOAD_HARD_MAX_FILES = 10;

export const FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type FormFileUploadAllowedMime =
  (typeof FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES)[number];

export type FormFileUploadConfig = {
  multiple: boolean;
  maxFiles: number;
  maxBytes: number;
  allowedMimeTypes: FormFileUploadAllowedMime[];
};

export type FormFileUploadRef = {
  mediaAssetId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  /**
   * Ephemeral client-only preview (e.g. blob:). Never a permanent public URL.
   * Ignored by server ownership checks and never persisted in FormAnswer.
   */
  previewUrl?: string;
};

export type FormFileUploadAnswer = {
  files: FormFileUploadRef[];
};

const MIME_SET = new Set<string>(FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES);

function isAllowedMime(value: string): value is FormFileUploadAllowedMime {
  return MIME_SET.has(value);
}

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

/**
 * Reads upload settings from FormField.config with safe defaults.
 */
export function readFileUploadConfig(config: unknown): FormFileUploadConfig {
  const root =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  const upload =
    root.upload && typeof root.upload === "object" && !Array.isArray(root.upload)
      ? (root.upload as Record<string, unknown>)
      : {};

  const multiple = upload.multiple === true;
  const maxFiles = Math.min(
    FORM_FILE_UPLOAD_HARD_MAX_FILES,
    asPositiveInt(
      upload.maxFiles,
      multiple ? 3 : FORM_FILE_UPLOAD_DEFAULT_MAX_FILES,
    ),
  );
  const maxBytes = Math.min(
    FORM_FILE_UPLOAD_HARD_MAX_BYTES,
    asPositiveInt(upload.maxBytes, FORM_FILE_UPLOAD_DEFAULT_MAX_BYTES),
  );

  let allowedMimeTypes = FORM_FILE_UPLOAD_ALLOWED_MIME_TYPES.slice();
  if (Array.isArray(upload.allowedMimeTypes)) {
    const filtered = upload.allowedMimeTypes.filter(
      (item): item is FormFileUploadAllowedMime =>
        typeof item === "string" && isAllowedMime(item),
    );
    if (filtered.length > 0) {
      allowedMimeTypes = filtered;
    }
  }

  return {
    multiple,
    maxFiles: multiple ? maxFiles : 1,
    maxBytes,
    allowedMimeTypes,
  };
}

export function buildFileUploadConfigJson(
  input: Partial<FormFileUploadConfig>,
): { upload: FormFileUploadConfig } {
  const base = readFileUploadConfig({ upload: input });
  return { upload: base };
}

export function isFormFileUploadAnswer(value: unknown): value is FormFileUploadAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const files = (value as { files?: unknown }).files;
  if (!Array.isArray(files)) {
    return false;
  }
  return files.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }
    const ref = item as FormFileUploadRef;
    return (
      typeof ref.mediaAssetId === "string" &&
      typeof ref.originalName === "string" &&
      typeof ref.mimeType === "string" &&
      typeof ref.byteSize === "number"
    );
  });
}

export function parseFormFileUploadAnswer(
  value: unknown,
): FormFileUploadAnswer | null {
  if (isFormFileUploadAnswer(value)) {
    return value;
  }
  return null;
}

export function parseFormFileUploadAnswerFromFormValue(
  raw: string,
): FormFileUploadAnswer | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return parseFormFileUploadAnswer(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}
