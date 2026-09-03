"use client";

/**
 * Guidance ERP — sealed transcript upload (presentation only).
 * Same server action / validation contract — UI only.
 */

import { useActionState, useId, useRef, useState } from "react";
import {
  uploadGuidanceFinalGradesAction,
  type GuidanceGradesUploadState,
} from "@/app/portal/student/services/guidance/grades/actions";
import { RibbonMark, SealMark } from "@/components/guidance/office/illustrations";
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
  successHref = "/portal/student/services/guidance",
  successLabel = "بازگشت به داشبورد",
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(
      next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null,
    );
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
      <div className="chamber-empty" role="status">
        <SealMark />
        <h2>سند روی میز مشاور است</h2>
        <p>
          {state.versionNumber
            ? `نسخه ${toPersianDigits(state.versionNumber)}${
                state.replaced ? " جایگزین نسخه قبلی شد." : " ثبت شد."
              }`
            : "کارنامه دریافت شد."}
        </p>
        <a href={successHref} className="chamber-go">
          {successLabel}
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="chamber-sheet">
      {state.error || clientError ? (
        <p role="alert" className="chamber-alert">
          {clientError ?? state.error}
        </p>
      ) : null}

      {hasExisting ? (
        <p className="chamber-kicker">
          {existingFileName ?? "کارنامه بارگذاری‌شده"}
          {existingVersion != null
            ? ` · نسخه ${toPersianDigits(existingVersion)}`
            : ""}
        </p>
      ) : null}

      <label
        htmlFor={inputId}
        className={[
          "chamber-deed",
          dragging ? "is-over" : "",
          file ? "is-ready" : "",
        ]
          .filter(Boolean)
          .join(" ")}
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
          className="gp-upload-field__input"
          onChange={(event) => assignFile(event.target.files?.[0] ?? null)}
        />
        {file ? <SealMark /> : <RibbonMark />}
        <h2>{file ? file.name : "این سند را روی میز بگذارید"}</h2>
        <p>
          {pending
            ? "در حال گذاشتن روی میز…"
            : file
              ? formatBytes(file.size)
              : acceptPdfOnly
                ? "PDF رسمی · حداکثر پنج مگابایت"
                : "PDF یا تصویر · حداکثر پنج مگابایت"}
        </p>
        <p className="chamber-deed__state">
          {file ? `فایل انتخاب‌شده: ${file.name}` : "فایلی انتخاب نشده است"}
        </p>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="chamber-deed__preview" />
        ) : null}
        <span className="chamber-quiet">
          {file ? "تعویض فایل" : "انتخاب فایل"}
        </span>
      </label>

      <button type="submit" disabled={pending || !file} className="chamber-go">
        {pending
          ? "در حال ارسال…"
          : hasExisting
            ? "جایگزینی سند"
            : "مُهر کردن سند"}
      </button>
    </form>
  );
}
