"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  importStudentPhotoBatchAction,
  previewStudentPhotoImportAction,
} from "@/app/admin/(dashboard)/website/students/import-photos/actions";
import { toPersianDigits } from "@/lib/persian";
import {
  STUDENT_PHOTO_IMPORT_ACCEPT,
  STUDENT_PHOTO_IMPORT_BATCH_SIZE,
  STUDENT_PHOTO_IMPORT_MAX_FILES,
  STUDENT_PHOTO_IMPORT_OUTCOME_LABELS,
  STUDENT_PHOTO_IMPORT_STATUS_LABELS,
  accumulatePhotoImportOutcome,
  buildStudentPhotoImportPreviewRows,
  emptyStudentPhotoImportReport,
  extractKanoonIdFromFilename,
  isAllowedStudentPhotoFilename,
  isStudentPhotoImportRowUploadable,
  type StudentPhotoImportBatchItemResult,
  type StudentPhotoImportFileMeta,
  type StudentPhotoImportMatchedStudent,
  type StudentPhotoImportPreviewRow,
  type StudentPhotoImportReport,
  type StudentPhotoImportRowOutcome,
} from "@/lib/website/student-photo-import";

type Phase = "upload" | "preview" | "importing" | "result";

const STEPS = ["انتخاب تصاویر", "پیش‌نمایش و تأیید", "نتیجه"] as const;

type SelectedFile = {
  clientKey: string;
  file: File;
  previewUrl: string;
};

function statusToneClass(
  status: StudentPhotoImportPreviewRow["status"],
): string {
  switch (status) {
    case "matched":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "already_has_photo":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "not_found":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "duplicate":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "invalid":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-border bg-background text-muted";
  }
}

function outcomeToneClass(outcome: StudentPhotoImportRowOutcome): string {
  switch (outcome) {
    case "imported":
    case "replaced":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "skipped":
    case "duplicate":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "not_found":
    case "invalid":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-border bg-background text-muted";
  }
}

export function StudentPhotoImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [previewRows, setPreviewRows] = useState<
    StudentPhotoImportPreviewRow[]
  >([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [report, setReport] = useState<StudentPhotoImportReport | null>(null);
  const [itemResults, setItemResults] = useState<
    StudentPhotoImportBatchItemResult[]
  >([]);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const selectedRef = useRef<SelectedFile[]>([]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    return () => {
      selectedRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

  const stepIndex =
    phase === "upload" ? 0 : phase === "result" ? 2 : 1;

  const previewCounts = useMemo(() => {
    const counts = {
      matched: 0,
      not_found: 0,
      duplicate: 0,
      invalid: 0,
      already_has_photo: 0,
      uploadable: 0,
    };
    for (const row of previewRows) {
      counts[row.status] += 1;
      if (isStudentPhotoImportRowUploadable(row, replaceExisting)) {
        counts.uploadable += 1;
      }
    }
    return counts;
  }, [previewRows, replaceExisting]);

  function clearSelected() {
    setSelected((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function applyFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const next: SelectedFile[] = [];
    const rejected: string[] = [];

    Array.from(fileList).forEach((file, index) => {
      if (!isAllowedStudentPhotoFilename(file.name)) {
        rejected.push(file.name);
        return;
      }
      next.push({
        clientKey: `${file.name}-${file.size}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (next.length === 0) {
      setError(
        rejected.length > 0
          ? "فقط فایل‌های JPG، JPEG، PNG یا WebP پذیرفته می‌شوند."
          : "لطفاً حداقل یک تصویر انتخاب کنید.",
      );
      return;
    }

    if (next.length > STUDENT_PHOTO_IMPORT_MAX_FILES) {
      next.slice(STUDENT_PHOTO_IMPORT_MAX_FILES).forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
      setError(
        `حداکثر ${toPersianDigits(STUDENT_PHOTO_IMPORT_MAX_FILES)} فایل در هر بار مجاز است.`,
      );
      const limited = next.slice(0, STUDENT_PHOTO_IMPORT_MAX_FILES);
      setSelected((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return limited;
      });
      return;
    }

    if (rejected.length > 0) {
      setError(
        `${toPersianDigits(rejected.length)} فایل به‌دلیل پسوند نامعتبر نادیده گرفته شد.`,
      );
    }

    setSelected((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return next;
    });
  }

  function handleBuildPreview() {
    setError(null);
    if (selected.length === 0) {
      setError("لطفاً حداقل یک تصویر انتخاب کنید.");
      return;
    }

    const metas: StudentPhotoImportFileMeta[] = selected.map((item) => ({
      clientKey: item.clientKey,
      filename: item.file.name,
      extractedId: extractKanoonIdFromFilename(item.file.name),
    }));

    const ids = metas
      .map((meta) => meta.extractedId)
      .filter((id): id is string => Boolean(id));

    startTransition(async () => {
      const result = await previewStudentPhotoImportAction(ids);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const map = new Map<string, StudentPhotoImportMatchedStudent>();
      for (const student of result.students) {
        map.set(student.kanoonStudentId, student);
      }

      setPreviewRows(buildStudentPhotoImportPreviewRows(metas, map));
      setPhase("preview");
    });
  }

  function handleImport() {
    setError(null);
    const uploadable = previewRows.filter((row) =>
      isStudentPhotoImportRowUploadable(row, replaceExisting),
    );
    const fileByKey = new Map(selected.map((item) => [item.clientKey, item]));

    const nextReport = emptyStudentPhotoImportReport();
    const allResults: StudentPhotoImportBatchItemResult[] = [];

    // Count non-uploadable rows into the report immediately.
    for (const row of previewRows) {
      if (isStudentPhotoImportRowUploadable(row, replaceExisting)) continue;
      let outcome: StudentPhotoImportRowOutcome;
      switch (row.status) {
        case "not_found":
          outcome = "not_found";
          break;
        case "invalid":
          outcome = "invalid";
          break;
        case "duplicate":
        case "already_has_photo":
          outcome = "skipped";
          break;
        default:
          outcome = "skipped";
          break;
      }
      accumulatePhotoImportOutcome(nextReport, outcome);
      allResults.push({
        clientKey: row.clientKey,
        filename: row.filename,
        outcome,
      });
    }

    if (uploadable.length === 0) {
      setReport(nextReport);
      setItemResults(allResults);
      setPhase("result");
      return;
    }

    setPhase("importing");
    setProgressDone(0);
    setProgressTotal(uploadable.length);

    startTransition(async () => {
      for (
        let offset = 0;
        offset < uploadable.length;
        offset += STUDENT_PHOTO_IMPORT_BATCH_SIZE
      ) {
        const chunk = uploadable.slice(
          offset,
          offset + STUDENT_PHOTO_IMPORT_BATCH_SIZE,
        );
        const formData = new FormData();
        formData.set("replaceExisting", replaceExisting ? "1" : "0");

        chunk.forEach((row, index) => {
          const selectedFile = fileByKey.get(row.clientKey);
          if (!selectedFile || !row.extractedId || !row.student) return;
          formData.set(`file_${index}`, selectedFile.file);
          formData.set(`clientKey_${index}`, row.clientKey);
          formData.set(`kanoonStudentId_${index}`, row.extractedId);
        });

        const batch = await importStudentPhotoBatchAction(formData);
        if (!batch.ok) {
          for (const row of chunk) {
            accumulatePhotoImportOutcome(nextReport, "failed");
            allResults.push({
              clientKey: row.clientKey,
              filename: row.filename,
              outcome: "failed",
              error: batch.error,
            });
          }
          setProgressDone((prev) => prev + chunk.length);
          continue;
        }

        const returnedKeys = new Set(batch.results.map((r) => r.clientKey));
        for (const item of batch.results) {
          accumulatePhotoImportOutcome(nextReport, item.outcome);
          allResults.push(item);
        }
        for (const row of chunk) {
          if (returnedKeys.has(row.clientKey)) continue;
          accumulatePhotoImportOutcome(nextReport, "failed");
          allResults.push({
            clientKey: row.clientKey,
            filename: row.filename,
            outcome: "failed",
            error: "پاسخی برای این فایل دریافت نشد.",
          });
        }
        setProgressDone((prev) => prev + chunk.length);
      }

      setReport(nextReport);
      setItemResults(allResults);
      setPhase("result");
    });
  }

  function handleReset() {
    clearSelected();
    setPreviewRows([]);
    setReplaceExisting(false);
    setReport(null);
    setItemResults([]);
    setProgressDone(0);
    setProgressTotal(0);
    setError(null);
    setPhase("upload");
  }

  return (
    <div className="space-y-4">
      <nav
        aria-label="مراحل ورود تصاویر"
        className="admin-card flex flex-wrap gap-2 p-3 text-xs sm:text-sm"
      >
        {STEPS.map((label, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <span
              key={label}
              className={`rounded-full border px-3 py-1.5 ${
                active
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-border bg-background text-muted"
              }`}
            >
              {toPersianDigits(index + 1)}. {label}
            </span>
          );
        })}
      </nav>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {error}
        </div>
      ) : null}

      {phase === "upload" ? (
        <section className="admin-card space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-primary">
              انتخاب چند تصویر
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              نام هر فایل باید شامل شناسه قلم‌چی باشد؛ مثلاً{" "}
              <span className="font-mono" dir="ltr">
                D537770001.jpg
              </span>
              . پسوندهای مجاز: JPG، JPEG، PNG، WebP. فایل ZIP پشتیبانی نمی‌شود.
            </p>
          </div>

          <div
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
              applyFiles(event.dataTransfer.files);
            }}
            className={`rounded-xl border border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
            }`}
          >
            <p className="text-sm text-primary">
              تصاویر را بکشید و رها کنید یا انتخاب کنید
            </p>
            <p className="mt-1 text-xs text-muted">
              حداکثر {toPersianDigits(STUDENT_PHOTO_IMPORT_MAX_FILES)} فایل در
              هر بار
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
              onClick={() => inputRef.current?.click()}
            >
              انتخاب تصاویر
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={STUDENT_PHOTO_IMPORT_ACCEPT}
              multiple
              className="sr-only"
              onChange={(event) => applyFiles(event.target.files)}
            />
          </div>

          {selected.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                {toPersianDigits(selected.length)} فایل انتخاب شده
              </p>
              <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
                {selected.map((item) => (
                  <li
                    key={item.clientKey}
                    className="overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    {/* Object URLs are local blobs — next/image optimization not needed */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <p className="truncate px-1.5 py-1 text-[10px] text-muted">
                      {item.file.name}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending || selected.length === 0}
              onClick={handleBuildPreview}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "در حال تطبیق…" : "ادامه به پیش‌نمایش"}
            </button>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={clearSelected}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
              >
                پاک کردن انتخاب
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {phase === "preview" ? (
        <section className="admin-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-primary">
                پیش‌نمایش تطبیق
              </h2>
              <p className="mt-1 text-xs leading-6 text-muted">
                قبل از بارگذاری، وضعیت هر فایل را بررسی کنید. تصاویر موجود به‌صورت
                پیش‌فرض جایگزین نمی‌شوند.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="size-4 rounded border-border"
              />
              جایگزینی تصاویر موجود
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900">
              تطبیق‌شده: {toPersianDigits(previewCounts.matched)}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">
              دارای تصویر: {toPersianDigits(previewCounts.already_has_photo)}
            </span>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-900">
              یافت نشد: {toPersianDigits(previewCounts.not_found)}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-900">
              تکراری: {toPersianDigits(previewCounts.duplicate)}
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-800">
              نامعتبر: {toPersianDigits(previewCounts.invalid)}
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted">
              قابل بارگذاری: {toPersianDigits(previewCounts.uploadable)}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-background text-muted">
                <tr>
                  <th className="px-3 py-3 text-start font-medium">تصویر</th>
                  <th className="px-3 py-3 text-start font-medium">نام فایل</th>
                  <th className="px-3 py-3 text-start font-medium">
                    شناسه استخراج‌شده
                  </th>
                  <th className="px-3 py-3 text-start font-medium">دانش‌آموز</th>
                  <th className="px-3 py-3 text-start font-medium">پایه</th>
                  <th className="px-3 py-3 text-start font-medium">تصویر فعلی</th>
                  <th className="px-3 py-3 text-start font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const thumb = selected.find(
                    (item) => item.clientKey === row.clientKey,
                  );
                  return (
                    <tr
                      key={row.clientKey}
                      className="border-b border-border/70"
                    >
                      <td className="px-3 py-2">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb.previewUrl}
                            alt=""
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="break-all font-mono text-xs" dir="ltr">
                          {row.filename}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.extractedId ? (
                          <span className="font-mono text-xs" dir="ltr">
                            {toPersianDigits(row.extractedId)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.student?.fullName ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.student?.gradeName ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.student
                          ? row.student.hasPortrait
                            ? "دارای تصویر"
                            : "بدون تصویر"
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${statusToneClass(row.status)}`}
                        >
                          {STUDENT_PHOTO_IMPORT_STATUS_LABELS[row.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={handleImport}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              تأیید و شروع بارگذاری
              {previewCounts.uploadable > 0
                ? ` (${toPersianDigits(previewCounts.uploadable)})`
                : ""}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setPhase("upload")}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
            >
              بازگشت
            </button>
          </div>
        </section>
      ) : null}

      {phase === "importing" ? (
        <section className="admin-card space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-primary">
            در حال بارگذاری…
          </h2>
          <p className="text-sm text-muted">
            {toPersianDigits(progressDone)} از {toPersianDigits(progressTotal)}{" "}
            فایل پردازش شد. لطفاً صفحه را نبندید.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width:
                  progressTotal > 0
                    ? `${Math.min(100, Math.round((progressDone / progressTotal) * 100))}%`
                    : "0%",
              }}
            />
          </div>
        </section>
      ) : null}

      {phase === "result" && report ? (
        <section className="admin-card space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-primary">گزارش نهایی</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              خلاصه نتیجه ورود گروهی تصاویر دانش‌آموزان
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["imported", report.imported],
                ["replaced", report.replaced],
                ["skipped", report.skipped],
                ["not_found", report.notFound],
                ["invalid", report.invalid],
                ["failed", report.failed],
              ] as const
            ).map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-background px-4 py-3"
              >
                <p className="text-xs text-muted">
                  {key === "imported"
                    ? "وارد شده"
                    : key === "replaced"
                      ? "جایگزین شده"
                      : key === "skipped"
                        ? "رد شده"
                        : key === "not_found"
                          ? "یافت نشده"
                          : key === "invalid"
                            ? "نامعتبر"
                            : "ناموفق"}
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {toPersianDigits(value)}
                </p>
              </div>
            ))}
          </div>

          {itemResults.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-background text-muted">
                  <tr>
                    <th className="px-3 py-3 text-start font-medium">نام فایل</th>
                    <th className="px-3 py-3 text-start font-medium">نتیجه</th>
                    <th className="px-3 py-3 text-start font-medium">توضیح</th>
                  </tr>
                </thead>
                <tbody>
                  {itemResults.map((item) => (
                    <tr
                      key={item.clientKey}
                      className="border-b border-border/70"
                    >
                      <td className="px-3 py-2">
                        <span
                          className="break-all font-mono text-xs"
                          dir="ltr"
                        >
                          {item.filename}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${outcomeToneClass(item.outcome)}`}
                        >
                          {STUDENT_PHOTO_IMPORT_OUTCOME_LABELS[item.outcome]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {item.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              ورود تصاویر جدید
            </button>
            <Link
              href="/admin/website/students"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
            >
              بازگشت به فهرست
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
