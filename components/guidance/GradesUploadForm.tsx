"use client";

/**
 * Guidance ERP — premium final grades upload (presentation only).
 * Same server action / validation contract — UI only.
 */

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  uploadGuidanceFinalGradesAction,
  type GuidanceGradesUploadState,
} from "@/app/portal/student/services/guidance/grades/actions";
import { PortalIcon } from "@/components/portal/icons";
import { PortalSurface } from "@/components/portal/PortalSurface";
import { toPersianDigits } from "@/lib/persian";

const initial: GuidanceGradesUploadState = {};

type GuidanceGradesUploadFormProps = {
  hasExisting: boolean;
  existingFileName?: string | null;
  existingVersion?: number | null;
  acceptPdfOnly?: boolean;
  successHref?: string;
  successLabel?: string;
};

const PDF_ACCEPT = "application/pdf,.pdf";
const DEFAULT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(size: number): string {
  if (size < 1024) return `${toPersianDigits(size)} B`;
  if (size < 1024 * 1024) {
    return `${toPersianDigits(Math.round(size / 1024))} KB`;
  }
  return `${toPersianDigits((size / (1024 * 1024)).toFixed(1))} MB`;
}

export function GuidanceGradesUploadForm({
  hasExisting,
  existingFileName = null,
  existingVersion = null,
  acceptPdfOnly = false,
  successHref = "/ms",
  successLabel = "بازگشت به دفتر",
}: GuidanceGradesUploadFormProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    uploadGuidanceFinalGradesAction,
    initial,
  );

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function assignFile(next: File | null) {
    if (next) {
      const isPdf =
        next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf");
      const isImage = next.type.startsWith("image/");
      if (acceptPdfOnly && !isPdf) {
        setClientError("فقط فایل PDF کارنامه رسمی پذیرفته می‌شود.");
        return;
      }
      if (!acceptPdfOnly && !isPdf && !isImage) {
        setClientError("فقط PDF یا تصویر JPEG/PNG/WebP پذیرفته می‌شود.");
        return;
      }
      if (next.size > MAX_BYTES) {
        setClientError("حجم فایل باید حداکثر ۵ مگابایت باشد.");
        return;
      }
    }
    setClientError(null);
    setFile(next);
    if (inputRef.current) {
      if (!next) {
        inputRef.current.value = "";
        return;
      }
      const transfer = new DataTransfer();
      transfer.items.add(next);
      inputRef.current.files = transfer.files;
    }
  }

  if (state.ok) {
    return (
      <PortalSurface
        accent="emerald"
        padding="lg"
        className="portal-upload-success"
      >
        <div role="status">
          <span className="portal-upload-success__badge" aria-hidden="true">
            <PortalIcon name="medal" className="size-7" />
          </span>
          <p className="portal-upload-success__title">کارنامه شما دریافت شد</p>
          <p className="portal-upload-success__support">در انتظار بررسی...</p>
          {state.versionNumber ? (
            <p className="portal-upload-success__meta">
              نسخه {toPersianDigits(state.versionNumber)}
              {state.replaced ? " (جایگزین نسخه قبلی)" : ""}
            </p>
          ) : null}
          <a href={successHref} className="portal-upload-success__cta">
            {successLabel}
          </a>
        </div>
      </PortalSurface>
    );
  }

  return (
    <form action={action} className="portal-upload">
      {state.error || clientError ? (
        <p role="alert" className="portal-upload__error">
          {clientError ?? state.error}
        </p>
      ) : null}

      {hasExisting ? (
        <PortalSurface accent="orange" padding="md" className="portal-upload-history">
          <p className="portal-upload-history__title">نسخه فعلی در پرونده</p>
          <p className="portal-upload-history__file">
            {existingFileName ?? "کارنامه بارگذاری‌شده"}
            {existingVersion != null
              ? ` · نسخه ${toPersianDigits(existingVersion)}`
              : ""}
          </p>
          <p className="portal-upload-history__hint">
            بارگذاری جدید به‌عنوان نسخه تازه ثبت می‌شود؛ نسخه قبلی در سوابق
            می‌ماند.
          </p>
        </PortalSurface>
      ) : null}

      <div
        className={[
          "portal-upload-dropzone",
          dragging ? "portal-upload-dropzone--dragging" : "",
          file ? "portal-upload-dropzone--ready" : "",
          pending ? "portal-upload-dropzone--pending" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-portal-accent="teal"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) assignFile(dropped);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="file"
          type="file"
          required
          accept={acceptPdfOnly ? PDF_ACCEPT : DEFAULT_ACCEPT}
          className="portal-upload-dropzone__input"
          onChange={(event) => assignFile(event.target.files?.[0] ?? null)}
        />

        <span className="portal-upload-dropzone__icon" aria-hidden="true">
          <PortalIcon name="clipboard" className="size-8" />
        </span>
        <p className="portal-upload-dropzone__title">
          فایل را بکش و رها کن، یا انتخاب کن
        </p>
        <p className="portal-upload-dropzone__hint">
          {acceptPdfOnly
            ? "فقط PDF رسمی · حداکثر ۵ مگابایت"
            : "PDF یا تصویر · حداکثر ۵ مگابایت"}
        </p>
        <label htmlFor={inputId} className="portal-upload-dropzone__pick">
          انتخاب فایل
        </label>

        {pending ? (
          <div className="portal-upload-progress" aria-live="polite">
            <span className="portal-upload-progress__bar" />
            <p>در حال بارگذاری امن فایل…</p>
          </div>
        ) : null}
      </div>

      {file ? (
        <PortalSurface accent="teal" padding="md" className="portal-upload-preview">
          <div className="portal-upload-preview__row">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="portal-upload-preview__thumb"
              />
            ) : (
              <span className="portal-upload-preview__file-icon" aria-hidden="true">
                <PortalIcon name="book" className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="portal-upload-preview__name">{file.name}</p>
              <p className="portal-upload-preview__meta">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              className="portal-upload-preview__replace"
              onClick={() => {
                assignFile(null);
                inputRef.current?.click();
              }}
            >
              تعویض
            </button>
          </div>
        </PortalSurface>
      ) : null}

      <button
        type="submit"
        disabled={pending || !file}
        className="portal-upload__submit"
      >
        {pending
          ? "در حال ارسال…"
          : hasExisting
            ? "جایگزینی کارنامه"
            : "ارسال کارنامه"}
      </button>
    </form>
  );
}
