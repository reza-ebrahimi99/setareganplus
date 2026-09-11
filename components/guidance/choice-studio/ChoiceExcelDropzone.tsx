"use client";

import { useRef, useState } from "react";

type DropState = "idle" | "drag" | "selected" | "parsing";

export function ChoiceExcelDropzone(props: {
  pending: boolean;
  fileName?: string;
  fileSize?: number;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const state: DropState = props.pending ? "parsing" : props.fileName ? "selected" : drag ? "drag" : "idle";

  return (
    <div
      className={`gcs-drop gcs-drop--${state}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files[0];
        if (file) props.onFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="gcs-drop__input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) props.onFile(file);
        }}
      />
      <div className="gcs-drop__icon" aria-hidden>
        XLSX
      </div>
      {state === "parsing" ? (
        <p>در حال خواندن و اعتبارسنجی فایل…</p>
      ) : props.fileName ? (
        <>
          <strong>{props.fileName}</strong>
          <span>{props.fileSize ? `${Math.max(1, Math.round(props.fileSize / 1024))} کیلوبایت` : ""}</span>
          <div className="gcs-drop__ops">
            <button type="button" className="gcs-btn gcs-btn--ghost" onClick={() => inputRef.current?.click()}>
              جایگزینی فایل
            </button>
            <button type="button" className="gcs-btn gcs-btn--ghost" onClick={props.onClear}>
              حذف
            </button>
          </div>
        </>
      ) : (
        <>
          <strong>فایل اکسل را اینجا رها کنید</strong>
          <p>فقط XLSX — بدون ماکرو. پیش‌نمایش قبل از ذخیره اجباری است.</p>
          <button type="button" className="gcs-btn gcs-btn--primary" onClick={() => inputRef.current?.click()}>
            انتخاب فایل اکسل
          </button>
        </>
      )}
    </div>
  );
}
