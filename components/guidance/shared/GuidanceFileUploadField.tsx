"use client";

/**
 * Persian RTL file upload — hides native browser chrome.
 * Presentation only; parent form keeps name/validation contract.
 */

import { useId, useRef, useState } from "react";
import { PortalIcon } from "@/components/portal/icons";
import { toPersianDigits } from "@/lib/persian";

type GuidanceFileUploadFieldProps = {
  id?: string;
  name?: string;
  required?: boolean;
  accept?: string;
  title?: string;
  helper?: string;
  existingLabel?: string | null;
  error?: string | null;
  onFileChange?: (file: File | null) => void;
};

const DEFAULT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";

function formatBytes(size: number): string {
  if (size < 1024) return `${toPersianDigits(size)} بایت`;
  if (size < 1024 * 1024) {
    return `${toPersianDigits(Math.round(size / 1024))} کیلوبایت`;
  }
  return `${toPersianDigits((size / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export function GuidanceFileUploadField({
  id,
  name = "file",
  required = false,
  accept = DEFAULT_ACCEPT,
  title = "بارگذاری کارنامه نهایی",
  helper = "فایل PDF یا تصویر · حداکثر ۵ مگابایت",
  existingLabel = null,
  error = null,
  onFileChange,
}: GuidanceFileUploadFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function assignFile(next: File | null) {
    setClientError(null);
    setFile(next);
    onFileChange?.(next);
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

  const displayError = error ?? clientError;

  return (
    <div className="gp-upload-field">
      <span className="gp-upload-field__label" id={`${inputId}-label`}>
        {title}
      </span>

      {existingLabel ? (
        <p className="gp-upload-field__existing" role="status">
          {existingLabel}
        </p>
      ) : null}

      <label
        htmlFor={inputId}
        className={[
          "gp-upload-field__dropzone",
          dragging ? "is-dragging" : "",
          file ? "is-selected" : "",
          displayError ? "is-error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-labelledby={`${inputId}-label`}
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
          name={name}
          type="file"
          required={required && !existingLabel}
          accept={accept}
          className="gp-upload-field__input"
          onChange={(event) => assignFile(event.target.files?.[0] ?? null)}
          aria-invalid={Boolean(displayError)}
          aria-describedby={displayError ? `${inputId}-error` : `${inputId}-hint`}
        />

        <span className="gp-upload-field__icon" aria-hidden="true">
          <PortalIcon name={file ? "shield" : "book"} className="size-6" />
        </span>

        {file ? (
          <>
            <strong className="gp-upload-field__filename">{file.name}</strong>
            <span className="gp-upload-field__meta">{formatBytes(file.size)}</span>
            <span className="gp-upload-field__action">تعویض فایل</span>
          </>
        ) : (
          <>
            <strong className="gp-upload-field__prompt">فایل را انتخاب کنید یا اینجا رها کنید</strong>
            <span className="gp-upload-field__meta" id={`${inputId}-hint`}>
              {helper}
            </span>
            <span className="gp-upload-field__action">انتخاب فایل</span>
          </>
        )}
      </label>

      {displayError ? (
        <p className="gp-upload-field__error" id={`${inputId}-error`} role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
