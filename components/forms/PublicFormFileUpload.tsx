"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPublicFormFileAction } from "@/app/forms/[slug]/upload-actions";
import {
  readFileUploadConfig,
  type FormFileUploadAnswer,
  type FormFileUploadRef,
} from "@/lib/forms/file-upload-config";
import type { PublicFormField as PublicFormFieldData } from "@/lib/forms/load-public-form";
import { toPersianDigits } from "@/lib/persian";

type PublicFormFileUploadProps = {
  field: PublicFormFieldData;
  formSlug: string;
  error?: string;
  defaultValue?: FormFileUploadAnswer;
  disabled?: boolean;
  idPrefix: string;
  onChange?: (value: FormFileUploadAnswer) => void;
};

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/**
 * Drag/drop + click upload control for FILE_UPLOAD fields.
 * Uploads immediately via existing MediaAsset pipeline; submits media refs as JSON.
 */
export function PublicFormFileUpload({
  field,
  formSlug,
  error,
  defaultValue,
  disabled = false,
  idPrefix,
  onChange,
}: PublicFormFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const config = readFileUploadConfig(field.config);
  const [files, setFiles] = useState<FormFileUploadRef[]>(
    () => defaultValue?.files ?? [],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accept = config.allowedMimeTypes.join(",");
  const combinedError = localError ?? error;

  function revokePreview(file: FormFileUploadRef) {
    if (file.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(file.previewUrl);
    }
  }

  function commit(next: FormFileUploadRef[]) {
    setFiles(next);
    onChange?.({ files: next });
  }

  function removeFile(mediaAssetId: string) {
    const target = files.find((file) => file.mediaAssetId === mediaAssetId);
    if (target) {
      revokePreview(target);
    }
    commit(files.filter((file) => file.mediaAssetId !== mediaAssetId));
  }

  function handleFilesSelected(list: FileList | null) {
    if (!list || list.length === 0 || disabled || pending) {
      return;
    }

    const remaining = config.maxFiles - files.length;
    if (config.multiple && remaining <= 0) {
      setLocalError(
        `حداکثر ${toPersianDigits(config.maxFiles)} فایل مجاز است.`,
      );
      return;
    }

    const queue = Array.from(list).slice(
      0,
      config.multiple ? Math.max(remaining, 0) : 1,
    );

    startTransition(async () => {
      setLocalError(null);
      let nextFiles = config.multiple ? [...files] : [];

      for (const file of queue) {
        if (config.multiple && nextFiles.length >= config.maxFiles) {
          break;
        }
        setProgressLabel(`در حال بارگذاری «${file.name}»…`);
        const body = new FormData();
        body.set("fieldKey", field.fieldKey);
        body.set("file", file);
        const result = await uploadPublicFormFileAction(formSlug, body);
        if (!result.ok) {
          setLocalError(result.error);
          setProgressLabel(null);
          return;
        }
        const ref: FormFileUploadRef = {
          mediaAssetId: result.file.mediaAssetId,
          originalName: result.file.originalName,
          mimeType: result.file.mimeType,
          byteSize: result.file.byteSize,
          previewUrl: isImageMime(result.file.mimeType)
            ? URL.createObjectURL(file)
            : undefined,
        };
        nextFiles = config.multiple ? [...nextFiles, ref] : [ref];
        if (!config.multiple) {
          for (const prior of files) {
            revokePreview(prior);
          }
        }
      }

      commit(nextFiles);
      setProgressLabel(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name={field.fieldKey}
        value={JSON.stringify({
          files: files.map(({ mediaAssetId, originalName, mimeType, byteSize }) => ({
            mediaAssetId,
            originalName,
            mimeType,
            byteSize,
          })),
        })}
        readOnly
      />

      <div
        role="button"
        tabIndex={disabled || pending ? -1 : 0}
        aria-disabled={disabled || pending}
        aria-label={`بارگذاری فایل برای ${field.label}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !pending) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleFilesSelected(event.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          disabled || pending
            ? "cursor-not-allowed border-border bg-slate-50 opacity-70"
            : "cursor-pointer border-secondary/40 bg-secondary/5 hover:bg-secondary/10"
        }`}
      >
        <p className="text-sm font-medium text-primary">
          فایل را بکشید و رها کنید یا برای انتخاب ضربه بزنید
        </p>
        <p className="mt-2 text-xs leading-6 text-muted">
          حداکثر حجم:{" "}
          {toPersianDigits(Math.round(config.maxBytes / (1024 * 1024)))} مگابایت
          {config.multiple
            ? ` · حداکثر ${toPersianDigits(config.maxFiles)} فایل`
            : " · یک فایل"}
        </p>
        <input
          ref={inputRef}
          id={`${idPrefix}-file-${field.fieldKey}`}
          type="file"
          accept={accept}
          multiple={config.multiple}
          disabled={disabled || pending}
          className="sr-only"
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
      </div>

      {progressLabel ? (
        <p className="text-sm text-muted" role="status">
          {progressLabel}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.mediaAssetId}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2"
            >
              {isImageMime(file.mimeType) && file.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob preview
                <img
                  src={file.previewUrl}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="inline-flex size-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-700"
                  aria-hidden="true"
                >
                  PDF
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.originalName}
                </p>
                <p className="text-xs text-muted">
                  {toPersianDigits(Math.round(file.byteSize / 1024))} کیلوبایت
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || pending}
                onClick={() => removeFile(file.mediaAssetId)}
                className="min-h-11 rounded-xl border border-border px-3 text-sm text-foreground hover:bg-background disabled:opacity-50"
              >
                حذف
              </button>
              {!config.multiple ? (
                <button
                  type="button"
                  disabled={disabled || pending}
                  onClick={() => inputRef.current?.click()}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm text-foreground hover:bg-background disabled:opacity-50"
                >
                  جایگزینی
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {combinedError ? (
        <p className="text-sm text-red-700" role="alert">
          {combinedError}
        </p>
      ) : null}
    </div>
  );
}
