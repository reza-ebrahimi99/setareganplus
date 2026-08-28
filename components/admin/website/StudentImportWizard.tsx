"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  downloadStudentImportInvalidRowsAction,
  downloadStudentImportTemplateAction,
  executeStudentImportAction,
  parseStudentImportAction,
  validateStudentImportAction,
} from "@/app/admin/(dashboard)/website/students/import/actions";
import {
  STUDENT_IMPORT_FIELD_LABELS,
  STUDENT_IMPORT_FIELDS,
  STUDENT_IMPORT_MAX_BYTES,
  STUDENT_IMPORT_PREVIEW_LIMIT,
  type GuardianImportStatus,
  type PortalImportStatus,
  type StudentColumnMapping,
  type StudentImportField,
  type StudentImportMode,
  type StudentImportResult,
  type StudentImportSession,
  type StudentWorkbookInspection,
  type ValidatedStudentImportRow,
} from "@/lib/website/student-import-shared";
import { toPersianDigits } from "@/lib/persian";

type Phase =
  | "upload"
  | "mapping"
  | "validation"
  | "confirm"
  | "result";

const STEPS = [
  "دانلود نمونه و انتخاب فایل",
  "تطبیق ستون‌ها",
  "بررسی و پیش‌نمایش",
  "تأیید نهایی",
  "نتیجه واردسازی",
] as const;

function mappingStorageKey(inspection: StudentWorkbookInspection): string {
  const signature = inspection.headers
    .map((header) => header.label.trim().toLocaleLowerCase("fa"))
    .join("|");
  return `student-import-mapping:v2:${signature}`;
}

function defaultMapping(
  inspection: StudentWorkbookInspection,
): StudentColumnMapping {
  const used = new Set<string>();
  return Object.fromEntries(
    inspection.headers.map((header) => {
      const suggested = header.suggestedField;
      if (suggested === "IGNORE" || used.has(suggested)) {
        return [String(header.column), "IGNORE"];
      }
      used.add(suggested);
      return [String(header.column), suggested];
    }),
  );
}

function downloadBase64File(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Badge({
  tone,
  children,
}: {
  tone: "neutral" | "ok" | "warn" | "danger" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-border bg-surface text-muted",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-950",
    danger: "border-red-200 bg-red-50 text-red-800",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  } as const;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function studentBadge(row: ValidatedStudentImportRow) {
  if (!row.ok) return <Badge tone="danger">دارای خطا</Badge>;
  if (row.classification === "create") return <Badge tone="ok">ایجاد جدید</Badge>;
  if (row.classification === "update")
    return <Badge tone="info">قابل به‌روزرسانی</Badge>;
  return <Badge tone="warn">دانش‌آموز تکراری</Badge>;
}

function guardianBadge(status: GuardianImportStatus) {
  switch (status) {
    case "new":
      return <Badge tone="ok">ولی جدید</Badge>;
    case "existing":
    case "linked":
    case "already_linked":
      return <Badge tone="info">ولی موجود</Badge>;
    case "conflict_warning":
      return <Badge tone="warn">نیازمند بررسی</Badge>;
    case "skipped_no_permission":
      return <Badge tone="warn">بدون مجوز پرتال</Badge>;
    case "skipped_incomplete":
      return <Badge tone="neutral">ولی ناقص</Badge>;
    default:
      return <Badge tone="neutral">بدون ولی</Badge>;
  }
}

function portalBadge(status: PortalImportStatus) {
  switch (status) {
    case "created":
    case "restored":
      return <Badge tone="ok">دسترسی ایجاد می‌شود</Badge>;
    case "existing":
      return <Badge tone="info">دسترسی موجود</Badge>;
    case "skipped_no_permission":
      return <Badge tone="warn">بدون مجوز</Badge>;
    case "skipped_no_mobile":
      return <Badge tone="neutral">بدون موبایل</Badge>;
    case "failed":
      return <Badge tone="danger">خطای دسترسی</Badge>;
    default:
      return <Badge tone="neutral">—</Badge>;
  }
}

export function StudentImportWizard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importSession, setImportSession] =
    useState<StudentImportSession | null>(null);
  const [inspection, setInspection] =
    useState<StudentWorkbookInspection | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [mapping, setMapping] = useState<StudentColumnMapping>({});
  const [mode, setMode] = useState<StudentImportMode>("create_only");
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [previewRows, setPreviewRows] = useState<ValidatedStudentImportRow[]>(
    [],
  );
  const [totalRows, setTotalRows] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [createCount, setCreateCount] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [canManagePortal, setCanManagePortal] = useState(false);
  const [importSubmitted, setImportSubmitted] = useState(false);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(
    null,
  );
  const [reportBase64, setReportBase64] = useState<string | null>(null);
  const [reportFilename, setReportFilename] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const phaseOrder: Phase[] = [
    "upload",
    "mapping",
    "validation",
    "confirm",
    "result",
  ];
  const stepIndex = phaseOrder.indexOf(phase);

  const fieldOptions = useMemo(
    () =>
      STUDENT_IMPORT_FIELDS.map((field) => ({
        value: field,
        label: STUDENT_IMPORT_FIELD_LABELS[field],
      })),
    [],
  );

  function clearParsedState() {
    setImportSession(null);
    setInspection(null);
    setSheetName("");
    setMapping({});
    setPreviewRows([]);
    setTotalRows(0);
    setValidCount(0);
    setInvalidCount(0);
    setCreateCount(0);
    setUpdateCount(0);
    setDuplicateCount(0);
    setImportSubmitted(false);
    setImportResult(null);
    setReportBase64(null);
    setReportFilename(null);
  }

  function resetForNewFile(file: File | null) {
    clearParsedState();
    setError(null);
    setPhase("upload");
    setFileName(file?.name ?? null);
    if (!file || !fileRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileRef.current.files = transfer.files;
  }

  function buildSessionFormData(): FormData | null {
    if (!importSession) {
      setError("لطفاً ابتدا فایل را در مرحله اول بارگذاری کنید.");
      return null;
    }
    const formData = new FormData();
    formData.set("session", JSON.stringify(importSession));
    formData.set("sheetName", sheetName || importSession.selectedSheet);
    formData.set("mapping", JSON.stringify(mapping));
    formData.set("mode", mode);
    if (confirmUpdate) formData.set("confirmUpdate", "true");
    return formData;
  }

  function handleDownloadTemplate() {
    setError(null);
    startTransition(async () => {
      const result = await downloadStudentImportTemplateAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64File(result.base64, result.filename);
    });
  }

  function handleParse() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("لطفاً فایل را انتخاب کنید.");
      return;
    }
    if (file.size > STUDENT_IMPORT_MAX_BYTES) {
      setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await parseStudentImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setImportSession(result.session);
      setInspection(result.inspection);
      setSheetName(result.inspection.selectedSheet);
      let nextMapping = defaultMapping(result.inspection);
      try {
        const stored = localStorage.getItem(
          mappingStorageKey(result.inspection),
        );
        if (stored) {
          nextMapping = {
            ...nextMapping,
            ...(JSON.parse(stored) as StudentColumnMapping),
          };
        }
      } catch {
        /* ignore */
      }
      setMapping(nextMapping);
      setPhase("mapping");
    });
  }

  function handleSheetChange(nextSheet: string) {
    if (!importSession?.sheetsData[nextSheet]) return;
    setSheetName(nextSheet);
    const sheet = importSession.sheetsData[nextSheet]!;
    const nextInspection: StudentWorkbookInspection = {
      sheets: importSession.sheets,
      selectedSheet: nextSheet,
      headerRowNumber: sheet.headerRowNumber,
      headers: sheet.headers,
      previewRows: sheet.rows
        .slice(0, 8)
        .map((row) =>
          sheet.headers.map((header) => row.values[header.column] ?? ""),
        ),
      rowCount: sheet.rows.length,
    };
    setInspection(nextInspection);
    setMapping(defaultMapping(nextInspection));
    setPreviewRows([]);
  }

  function handleValidate() {
    setError(null);
    const formData = buildSessionFormData();
    if (!formData) return;
    startTransition(async () => {
      if (inspection) {
        localStorage.setItem(
          mappingStorageKey(inspection),
          JSON.stringify(mapping),
        );
      }
      const result = await validateStudentImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreviewRows(result.previewRows);
      setTotalRows(result.totalRows);
      setValidCount(result.validCount);
      setInvalidCount(result.invalidCount);
      setCreateCount(result.createCount);
      setUpdateCount(result.updateCount);
      setDuplicateCount(result.duplicateCount);
      setCanManagePortal(result.canManagePortal);
      setImportSubmitted(false);
      setPhase("validation");
    });
  }

  function handleDownloadInvalid() {
    setError(null);
    const formData = buildSessionFormData();
    if (!formData) return;
    startTransition(async () => {
      const result = await downloadStudentImportInvalidRowsAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64File(result.base64, result.filename);
    });
  }

  function handleImport() {
    setError(null);
    if (importSubmitted || pending) return;
    if (createCount + updateCount === 0) {
      setError("ردیفی برای واردسازی وجود ندارد.");
      return;
    }
    if (mode === "create_and_update" && !confirmUpdate) {
      setError("برای حالت به‌روزرسانی باید هشدار را تأیید کنید.");
      return;
    }
    const formData = buildSessionFormData();
    if (!formData) return;
    setImportSubmitted(true);
    startTransition(async () => {
      const result = await executeStudentImportAction(formData);
      if (!result.ok) {
        setImportSubmitted(false);
        setError(result.error);
        return;
      }
      setImportResult(result.result);
      setReportBase64(result.reportBase64);
      setReportFilename(result.reportFilename);
      setPhase("result");
    });
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs ${
              index <= Math.max(stepIndex, 0)
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted"
            }`}
          >
            {toPersianDigits(index + 1)}. {label}
          </li>
        ))}
      </ol>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <div className="admin-card space-y-4 p-5">
        {/* Keep input mounted so users can pick a replacement file without losing DOM node mid-flow; parsed session is authoritative after step 1. */}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={phase === "upload" ? "sr-only" : "hidden"}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file) {
              setFileName(file.name);
              if (phase !== "upload" || importSession) {
                clearParsedState();
                setPhase("upload");
              }
            }
          }}
        />

        {phase === "upload" ? (
          <div className="space-y-4">
            <p className="text-sm leading-7 text-muted">
              فایل را یک‌بار بارگذاری کنید؛ مراحل بعدی از دادهٔ پارس‌شده استفاده
              می‌کنند و دیگر به فایل نیاز ندارند.
            </p>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={pending}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {pending ? "در حال آماده‌سازی…" : "دانلود نمونه اکسل"}
            </button>

            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0] ?? null;
                if (file) resetForNewFile(file);
              }}
              className={`rounded-2xl border border-dashed px-4 py-8 text-center transition ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              }`}
            >
              <p className="mb-2 text-sm font-medium text-primary">
                فایل را اینجا رها کنید یا انتخاب کنید
              </p>
              <p className="mb-4 text-xs text-muted">
                فرمت‌های مجاز: .xlsx و .csv — حداکثر ۵ مگابایت
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              >
                انتخاب فایل
              </button>
              {fileName || importSession ? (
                <p className="mt-3 text-sm text-muted">
                  فایل: {importSession?.filename ?? fileName ?? "—"}
                </p>
              ) : null}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-primary">
                رفتار رکوردهای تکراری
              </span>
              <select
                value={mode}
                onChange={(event) => {
                  const next = event.target.value as StudentImportMode;
                  setMode(next);
                  if (next !== "create_and_update") setConfirmUpdate(false);
                }}
                className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="create_only">
                  فقط ایجاد دانش‌آموزان جدید (رد کردن تکراری‌ها)
                </option>
                <option value="create_and_update">
                  ایجاد جدید و به‌روزرسانی رکوردهای موجود (بر اساس اسلاگ)
                </option>
              </select>
            </label>

            {mode === "create_and_update" ? (
              <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <input
                  type="checkbox"
                  checked={confirmUpdate}
                  onChange={(event) => setConfirmUpdate(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  متوجه هستم که رکوردهای موجود با اسلاگ یکسان به‌روزرسانی
                  می‌شوند؛ روابط ولی/پرتال موجود بازنویسی خاموش نمی‌شوند.
                </span>
              </label>
            ) : null}

            <button
              type="button"
              onClick={handleParse}
              disabled={pending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {pending ? "در حال خواندن…" : "ادامه به تطبیق ستون‌ها"}
            </button>
          </div>
        ) : null}

        {phase === "mapping" && inspection && importSession ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              فایل «{importSession.filename}» —{" "}
              {toPersianDigits(inspection.rowCount)} ردیف داده.
            </p>
            {importSession.parseWarnings.length > 0 ? (
              <ul className="space-y-1 text-sm text-amber-900">
                {importSession.parseWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            {inspection.sheets.length > 1 ? (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">برگه</span>
                <select
                  value={sheetName}
                  onChange={(event) => handleSheetChange(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
                >
                  {inspection.sheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="space-y-3">
              {inspection.headers.map((header) => (
                <label key={header.column} className="block text-sm">
                  <span className="mb-1 block text-muted">{header.label}</span>
                  <select
                    value={mapping[String(header.column)] ?? "IGNORE"}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [String(header.column)]: event.target
                          .value as StudentImportField,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    {fieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPhase("upload")}
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              >
                بازگشت
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
              >
                {pending ? "در حال اعتبارسنجی…" : "بررسی و پیش‌نمایش"}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "validation" || phase === "confirm" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="کل ردیف‌ها" value={totalRows} />
              <Stat label="معتبر" value={validCount} />
              <Stat label="نامعتبر" value={invalidCount} />
              <Stat label="ایجاد جدید" value={createCount} />
              <Stat label="قابل به‌روزرسانی" value={updateCount} />
              <Stat label="تکراری (رد)" value={duplicateCount} />
            </div>

            {!canManagePortal ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                مجوز students.portal.manage ندارید؛ ولی و دسترسی پرتال ایجاد
                نمی‌شود.
              </p>
            ) : null}

            <div className="space-y-3 md:hidden">
              {previewRows.slice(0, STUDENT_IMPORT_PREVIEW_LIMIT).map((row) => (
                <article
                  key={row.excelRow}
                  className="rounded-xl border border-border bg-background p-3 text-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-muted">
                      ردیف {toPersianDigits(row.excelRow)}
                    </span>
                    {studentBadge(row)}
                    {row.ok ? guardianBadge(row.guardianStatusPreview) : null}
                    {row.ok
                      ? portalBadge(row.studentPortalStatusPreview)
                      : null}
                    {row.ok
                      ? portalBadge(row.guardianPortalStatusPreview)
                      : null}
                  </div>
                  <p className="font-medium text-primary">
                    {row.ok
                      ? row.fullName
                      : `${row.data.firstName ?? ""} ${row.data.lastName ?? ""}`.trim() ||
                        "—"}
                  </p>
                  <p className="mt-1 text-muted">
                    {row.ok ? row.gradeName : row.data.grade || "—"}
                    {row.ok && row.kanoonStudentId
                      ? ` · قلم‌چی ${toPersianDigits(row.kanoonStudentId)}`
                      : ""}
                    {row.ok && row.studentMobile
                      ? ` · ${toPersianDigits(row.studentMobile)}`
                      : ""}
                  </p>
                  {row.ok && row.guardianMobile ? (
                    <p className="mt-1 text-muted">
                      ولی: {row.guardianFirstName} {row.guardianLastName} ·{" "}
                      {toPersianDigits(row.guardianMobile)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-6">
                    {row.ok ? row.warning || "معتبر" : row.error}
                  </p>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-2 py-2 text-start">ردیف</th>
                    <th className="px-2 py-2 text-start">دانش‌آموز</th>
                    <th className="px-2 py-2 text-start">پایه</th>
                    <th className="px-2 py-2 text-start">شناسه قلم‌چی</th>
                    <th className="px-2 py-2 text-start">موبایل</th>
                    <th className="px-2 py-2 text-start">ولی</th>
                    <th className="px-2 py-2 text-start">وضعیت‌ها</th>
                    <th className="px-2 py-2 text-start">پیام</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows
                    .slice(0, STUDENT_IMPORT_PREVIEW_LIMIT)
                    .map((row) => (
                      <tr
                        key={row.excelRow}
                        className="border-b border-border/70 align-top"
                      >
                        <td className="px-2 py-2">
                          {toPersianDigits(row.excelRow)}
                        </td>
                        <td className="px-2 py-2">
                          {row.ok
                            ? row.fullName
                            : `${row.data.firstName ?? ""} ${row.data.lastName ?? ""}`.trim() ||
                              "—"}
                        </td>
                        <td className="px-2 py-2">
                          {row.ok ? row.gradeName : row.data.grade || "—"}
                        </td>
                        <td className="px-2 py-2" dir="ltr">
                          {row.ok && row.kanoonStudentId
                            ? toPersianDigits(row.kanoonStudentId)
                            : row.data.kanoonStudentIdRaw
                              ? toPersianDigits(row.data.kanoonStudentIdRaw)
                              : "—"}
                        </td>
                        <td className="px-2 py-2">
                          {row.ok && row.studentMobile
                            ? toPersianDigits(row.studentMobile)
                            : "—"}
                        </td>
                        <td className="px-2 py-2">
                          {row.ok && row.guardianMobile
                            ? `${row.guardianFirstName} ${row.guardianLastName} · ${toPersianDigits(row.guardianMobile)}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {studentBadge(row)}
                            {row.ok
                              ? guardianBadge(row.guardianStatusPreview)
                              : null}
                            {row.ok
                              ? portalBadge(row.studentPortalStatusPreview)
                              : null}
                            {row.ok
                              ? portalBadge(row.guardianPortalStatusPreview)
                              : null}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {row.ok ? row.warning || "—" : row.error}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 ? (
              <button
                type="button"
                onClick={handleDownloadInvalid}
                disabled={pending}
                className="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-60"
              >
                دانلود ردیف‌های نامعتبر
              </button>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPhase("mapping")}
                className="rounded-xl border border-border px-4 py-2.5 text-sm"
              >
                بازگشت به تطبیق
              </button>
              {phase === "validation" ? (
                <button
                  type="button"
                  onClick={() => setPhase("confirm")}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm"
                >
                  ادامه به تأیید نهایی
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={
                    pending ||
                    importSubmitted ||
                    createCount + updateCount === 0
                  }
                  className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
                >
                  {pending || importSubmitted
                    ? "در حال واردسازی…"
                    : "تأیید و شروع واردسازی"}
                </button>
              )}
            </div>

            {phase === "confirm" ? (
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7">
                <p>
                  {toPersianDigits(createCount)} دانش‌آموز جدید ایجاد می‌شود.
                </p>
                <p>
                  {toPersianDigits(updateCount)} رکورد به‌روزرسانی می‌شود.
                </p>
                <p>
                  {toPersianDigits(duplicateCount)} رکورد تکراری رد می‌شود.
                </p>
                <p>
                  {toPersianDigits(invalidCount)} ردیف به‌دلیل خطا وارد
                  نمی‌شود.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "result" && importResult ? (
          <div className="space-y-4">
            <p className="text-sm leading-7">
              کل {toPersianDigits(importResult.totalRows)} ردیف —{" "}
              {toPersianDigits(importResult.created)} ایجاد،{" "}
              {toPersianDigits(importResult.updated)} به‌روزرسانی،{" "}
              {toPersianDigits(importResult.skipped)} رد شده،{" "}
              {toPersianDigits(importResult.guardiansCreated)} ولی جدید،{" "}
              {toPersianDigits(importResult.studentPortalsCreated)} پرتال
              دانش‌آموز، {toPersianDigits(importResult.guardianPortalsCreated)}{" "}
              پرتال ولی.
            </p>
            <div className="flex flex-wrap gap-3">
              {reportBase64 && reportFilename ? (
                <button
                  type="button"
                  onClick={() =>
                    downloadBase64File(reportBase64, reportFilename)
                  }
                  className="rounded-xl border border-border px-4 py-2.5 text-sm"
                >
                  دانلود گزارش
                </button>
              ) : null}
              <Link
                href="/admin/website/students"
                className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
              >
                بازگشت به فهرست دانش‌آموزان
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold text-primary">
        {toPersianDigits(value)}
      </p>
    </div>
  );
}
