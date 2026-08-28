"use client";

import { useRef, useState, useTransition } from "react";
import {
  commitCatalogImportAction,
  downloadImportReportCsvAction,
  inspectCatalogImportAction,
  validateCatalogImportAction,
} from "@/app/admin/(dashboard)/books/catalog/import/actions";
import {
  CATALOG_IMPORT_MAPPING_FIELDS,
  type CatalogImportColumnMapping,
  type CatalogImportMappingField,
} from "@/lib/books/catalog/import-mapping";
import type {
  CatalogWorkbookInspection,
  InvalidCatalogRow,
} from "@/lib/books/catalog/import-parser";
import type { CatalogImportSummary } from "@/lib/books/catalog/import-service";
import { toPersianDigits } from "@/lib/persian";

type Phase = "upload" | "mapping" | "confirm" | "result";

const STEPS: Record<Phase, string> = {
  upload: "بارگذاری",
  mapping: "تطبیق ستون‌ها",
  confirm: "پیش‌نمایش و تأیید",
  result: "نتیجه",
};

const FIELD_LABELS: Record<CatalogImportMappingField, string> = {
  IGNORE: "نادیده گرفتن",
  internalCode: "کد داخلی *",
  title: "عنوان *",
  publisherName: "ناشر",
  bookTypeName: "نوع کتاب",
  gradeName: "پایه",
  subjectName: "درس",
  majorName: "رشته",
  editionLabel: "چاپ/ویرایش",
  editionYear: "سال چاپ",
  barcode: "بارکد/شابک",
  listPriceRials: "قیمت فهرست (ریال) *",
  salePriceRials: "قیمت فروش ویژه (ریال)",
  keywords: "کلیدواژه",
  tags: "برچسب‌ها",
};

function defaultMapping(inspection: CatalogWorkbookInspection): CatalogImportColumnMapping {
  const used = new Set<CatalogImportMappingField>();
  const mapping: CatalogImportColumnMapping = {};
  for (const header of inspection.headers) {
    const suggested = header.suggestedField;
    if (suggested === "IGNORE" || used.has(suggested)) {
      mapping[String(header.column)] = "IGNORE";
    } else {
      used.add(suggested);
      mapping[String(header.column)] = suggested;
    }
  }
  return mapping;
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-primary"
          : done
            ? "rounded-full border border-border bg-background px-3 py-1 text-xs text-muted"
            : "rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted"
      }
    >
      {label}
    </span>
  );
}

export function CatalogImportWizard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [pending, startTransition] = useTransition();
  const [inspection, setInspection] = useState<CatalogWorkbookInspection | null>(null);
  const [mapping, setMapping] = useState<CatalogImportColumnMapping>({});
  const [invalidRows, setInvalidRows] = useState<InvalidCatalogRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [strategy, setStrategy] = useState<"UPDATE_EXISTING" | "SKIP_EXISTING">("UPDATE_EXISTING");
  const [createMissingTaxonomies, setCreateMissingTaxonomies] = useState(true);
  const [summary, setSummary] = useState<CatalogImportSummary | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function reset() {
    setFile(null);
    setPhase("upload");
    setInspection(null);
    setMapping({});
    setInvalidRows([]);
    setValidCount(0);
    setSummary(null);
    setJobId(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleUpload() {
    const selected = fileInputRef.current?.files?.[0];
    if (!selected) {
      setError("یک فایل XLSX انتخاب کنید.");
      return;
    }
    setError("");
    setFile(selected);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", selected);
      const result = await inspectCatalogImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInspection(result.inspection);
      setMapping(defaultMapping(result.inspection));
      setPhase("mapping");
    });
  }

  function handleValidate() {
    if (!file) return;
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mapping", JSON.stringify(mapping));
      const result = await validateCatalogImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setValidCount(result.validCount);
      setInvalidRows(result.invalidRows);
      setPhase("confirm");
    });
  }

  function handleCommit() {
    if (!file) return;
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mapping", JSON.stringify(mapping));
      formData.set("strategy", strategy);
      if (createMissingTaxonomies) formData.set("createMissingTaxonomies", "on");
      const result = await commitCatalogImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
      setJobId(result.jobId);
      setPhase("result");
    });
  }

  async function handleDownloadReport() {
    if (!jobId) return;
    const csv = await downloadImportReportCsvAction(jobId);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `book-import-report-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STEPS) as Phase[]).map((key, index) => (
          <Step
            key={key}
            label={STEPS[key]}
            active={phase === key}
            done={(Object.keys(STEPS) as Phase[]).indexOf(phase) > index}
          />
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {phase === "upload" ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary">بارگذاری فایل کاتالوگ</h2>
          <p className="mt-1 text-sm leading-7 text-muted">
            فقط XLSX، حداکثر ۸ مگابایت، تا ۵٬۰۰۰ ردیف. فرمول‌ها اجرا نمی‌شوند و فقط مقدار خوانده می‌شود.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="mt-4 block w-full text-sm text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={pending}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال بررسی…" : "بررسی فایل"}
          </button>
        </section>
      ) : null}

      {phase === "mapping" && inspection ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary">
            تطبیق ستون‌ها — {toPersianDigits(inspection.totalRows)} ردیف یافت شد
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-3 py-2 font-medium">ستون فایل</th>
                  <th className="px-3 py-2 font-medium">فیلد مقصد</th>
                </tr>
              </thead>
              <tbody>
                {inspection.headers.map((header) => (
                  <tr key={header.column} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-primary">{header.label}</td>
                    <td className="px-3 py-2">
                      <select
                        value={mapping[String(header.column)] ?? "IGNORE"}
                        onChange={(event) =>
                          setMapping((prev) => ({
                            ...prev,
                            [String(header.column)]: event.target.value as CatalogImportMappingField,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-primary"
                      >
                        {CATALOG_IMPORT_MAPPING_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {FIELD_LABELS[field]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "در حال اعتبارسنجی…" : "اعتبارسنجی"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "confirm" ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary">پیش‌نمایش نتیجه اعتبارسنجی</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
              <p className="text-xs text-muted">ردیف‌های معتبر</p>
              <p className="mt-1 text-xl font-bold text-primary">{toPersianDigits(validCount)}</p>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
              <p className="text-xs text-muted">ردیف‌های نامعتبر</p>
              <p className="mt-1 text-xl font-bold text-danger">{toPersianDigits(invalidRows.length)}</p>
            </div>
          </div>

          {invalidRows.length > 0 ? (
            <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted">
                    <th className="px-3 py-2 font-medium">ردیف</th>
                    <th className="px-3 py-2 font-medium">کد داخلی</th>
                    <th className="px-3 py-2 font-medium">خطاها</th>
                  </tr>
                </thead>
                <tbody>
                  {invalidRows.map((row) => (
                    <tr key={row.excelRowNumber} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{toPersianDigits(row.excelRowNumber)}</td>
                      <td className="px-3 py-2" dir="ltr">
                        {row.internalCode || "—"}
                      </td>
                      <td className="px-3 py-2 text-danger">{row.errors.join("، ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium text-primary">
                برخورد با کدهای داخلی تکراری موجود
              </p>
              <div className="flex gap-4 text-sm text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === "UPDATE_EXISTING"}
                    onChange={() => setStrategy("UPDATE_EXISTING")}
                  />
                  به‌روزرسانی موجود
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === "SKIP_EXISTING"}
                    onChange={() => setStrategy("SKIP_EXISTING")}
                  />
                  نادیده گرفتن موجود
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={createMissingTaxonomies}
                onChange={(event) => setCreateMissingTaxonomies(event.target.checked)}
              />
              ناشر/نوع کتاب ناموجود به‌طور خودکار ساخته شود
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPhase("mapping")}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted"
            >
              بازگشت
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={pending || validCount === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "در حال ورود…" : `ورود ${toPersianDigits(validCount)} ردیف`}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "result" && summary ? (
        <section className="admin-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-primary">ورود اکسل انجام شد</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted">افزوده شد</p>
              <p className="mt-1 text-xl font-bold text-primary">{toPersianDigits(summary.inserted)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted">به‌روزرسانی شد</p>
              <p className="mt-1 text-xl font-bold text-primary">{toPersianDigits(summary.updated)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted">نادیده گرفته شد</p>
              <p className="mt-1 text-xl font-bold text-primary">{toPersianDigits(summary.skipped)}</p>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
              <p className="text-xs text-muted">خطا</p>
              <p className="mt-1 text-xl font-bold text-danger">{toPersianDigits(summary.errors)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {toPersianDigits(summary.priceChanges)} مورد تغییر قیمت در تاریخچه ثبت شد.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              دانلود گزارش (CSV)
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted"
            >
              ورود فایل دیگر
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
