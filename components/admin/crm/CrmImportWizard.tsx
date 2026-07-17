"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  executeCrmImportAction,
  inspectCrmImportAction,
  validateCrmImportAction,
  type ValidateImportActionResult,
} from "@/app/admin/(dashboard)/crm/import/actions";
import {
  type CrmImportResult,
} from "@/lib/crm/import-service";
import {
  type ImportColumnMapping,
  type ImportDuplicateStrategy,
  type ImportMappingField,
  type WorkbookInspection,
} from "@/lib/crm/import-parser";

type Props = {
  branches: Array<{ id: string; name: string }>;
};

type Phase = "upload" | "mapping" | "validated" | "result";

const STEPS = [
  "بارگذاری فایل",
  "انتخاب شیت",
  "پیش‌نمایش",
  "تطبیق ستون‌ها",
  "اعتبارسنجی",
  "ورود اطلاعات",
  "گزارش نتیجه",
] as const;

const FIELD_OPTIONS: Array<{ value: ImportMappingField; label: string }> = [
  { value: "IGNORE", label: "نادیده گرفتن" },
  { value: "firstName", label: "نام" },
  { value: "lastName", label: "نام خانوادگی" },
  { value: "fullName", label: "نام کامل" },
  { value: "fatherName", label: "نام پدر" },
  { value: "mobile", label: "موبایل" },
  { value: "nationalCode", label: "کد ملی" },
  { value: "school", label: "مدرسه" },
  { value: "gradeLevel", label: "پایه" },
  { value: "studyField", label: "رشته" },
  { value: "city", label: "شهر" },
  { value: "province", label: "استان" },
  { value: "gender", label: "جنسیت" },
  { value: "birthDate", label: "تاریخ تولد" },
  { value: "source", label: "منبع (فقط فراداده)" },
  { value: "description", label: "توضیحات" },
  { value: "email", label: "ایمیل (فراداده)" },
];

function phaseStep(phase: Phase): number {
  if (phase === "upload") return 0;
  if (phase === "mapping") return 3;
  if (phase === "validated") return 5;
  return 6;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-card p-4 sm:p-6">
      <h2 className="mb-4 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function CrmImportWizard({ branches }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("upload");
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0]!.id : "");
  const [strategy, setStrategy] = useState<ImportDuplicateStrategy>("SKIP");
  const [validation, setValidation] = useState<
    Extract<ValidateImportActionResult, { ok: true }>["summary"] | null
  >(null);
  const [result, setResult] = useState<CrmImportResult | null>(null);
  const [error, setError] = useState("");

  function selectedFile(): File | null {
    return fileInputRef.current?.files?.[0] ?? null;
  }

  function formDataBase(): FormData | null {
    const file = selectedFile();
    if (!file) {
      setError("لطفاً یک فایل XLSX یا CSV انتخاب کنید.");
      return null;
    }
    const formData = new FormData();
    formData.set("file", file);
    if (inspection) formData.set("sheetName", inspection.selectedSheet);
    formData.set("mapping", JSON.stringify(mapping));
    formData.set("branchId", branchId);
    formData.set("strategy", strategy);
    return formData;
  }

  function inspect(sheetName?: string) {
    const formData = formDataBase();
    if (!formData) return;
    if (sheetName) formData.set("sheetName", sheetName);
    setError("");
    startTransition(async () => {
      const response = await inspectCrmImportAction(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setInspection(response.inspection);
      setMapping(
        Object.fromEntries(
          response.inspection.headers.map((header) => [
            String(header.column),
            header.suggestedField,
          ]),
        ),
      );
      setValidation(null);
      setResult(null);
      setPhase("mapping");
    });
  }

  function validate() {
    const formData = formDataBase();
    if (!formData) return;
    setError("");
    startTransition(async () => {
      const response = await validateCrmImportAction(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setValidation(response.summary);
      setPhase("validated");
    });
  }

  function execute() {
    const formData = formDataBase();
    if (!formData) return;
    if (!branchId) {
      setError("شعبه مقصد را انتخاب کنید.");
      return;
    }
    setError("");
    startTransition(async () => {
      const response = await executeCrmImportAction(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.result);
      setPhase("result");
    });
  }

  function downloadCsv() {
    if (!result) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "crm-import-result.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setInspection(null);
    setMapping({});
    setValidation(null);
    setResult(null);
    setError("");
    setPhase("upload");
  }

  const activeStep = phaseStep(phase);

  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="مراحل ورود">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2 text-center text-xs ${
              index <= activeStep
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-muted"
            }`}
          >
            <span className="block font-bold">{formatNumber(index + 1)}</span>
            {step}
          </li>
        ))}
      </ol>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card title="۱. بارگذاری فایل">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label htmlFor="crm-import-file" className="text-sm font-medium text-primary">
              فایل XLSX یا CSV
            </label>
            <input
              ref={fileInputRef}
              id="crm-import-file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              disabled={pending || phase === "result"}
              onChange={() => {
                setInspection(null);
                setValidation(null);
                setResult(null);
                setPhase("upload");
                setError("");
              }}
              className="mt-2 block w-full rounded-xl border border-border bg-white p-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-secondary/15 file:px-3 file:py-2 file:text-primary"
            />
            <p className="mt-2 text-xs leading-6 text-muted">
              حداکثر ۵ مگابایت، ۱۰٬۰۰۰ ردیف و ۱۰۰ ستون. فایل XLS قدیمی پشتیبانی نمی‌شود.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inspect()}
            disabled={pending || phase === "result"}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending && phase === "upload" ? "در حال خواندن…" : "خواندن فایل"}
          </button>
        </div>
      </Card>

      {inspection && phase !== "result" ? (
        <>
          <Card title="۲. انتخاب شیت">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block font-medium text-primary">شیت</span>
                <select
                  value={inspection.selectedSheet}
                  disabled={pending}
                  onChange={(event) => inspect(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
                >
                  {inspection.worksheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name} — {formatNumber(sheet.rowCount)} ردیف
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                <p>فایل: {inspection.fileName}</p>
                <p>ردیف‌های اطلاعات: {formatNumber(inspection.totalRows)}</p>
              </div>
            </div>
          </Card>

          <Card title="۳. پیش‌نمایش ۲۰ ردیف نخست">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-right">
                    <th className="px-2 py-2">ردیف</th>
                    {inspection.headers.map((header) => (
                      <th key={header.column} className="px-2 py-2">
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspection.preview.map((row) => (
                    <tr key={row.excelRowNumber} className="border-b border-border/60">
                      <td className="px-2 py-2">{formatNumber(row.excelRowNumber)}</td>
                      {row.cells.map((cell, index) => (
                        <td key={index} className="max-w-64 truncate px-2 py-2" title={cell}>
                          {cell || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="۴. تطبیق ستون‌ها">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inspection.headers.map((header) => (
                <label key={header.column} className="rounded-xl border border-border p-3 text-sm">
                  <span className="mb-2 block truncate font-medium text-primary" title={header.label}>
                    {header.label}
                  </span>
                  <select
                    value={mapping[String(header.column)] ?? "IGNORE"}
                    disabled={pending}
                    onChange={(event) => {
                      setMapping((current) => ({
                        ...current,
                        [String(header.column)]: event.target.value as ImportMappingField,
                      }));
                      setValidation(null);
                      setPhase("mapping");
                    }}
                    className="w-full rounded-lg border border-border bg-white px-2 py-2"
                  >
                    {FIELD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block font-medium text-primary">شعبه مقصد</span>
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
                >
                  <option value="">انتخاب شعبه</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-2 block font-medium text-primary">رفتار با موبایل تکراری</span>
                <select
                  value={strategy}
                  onChange={(event) =>
                    setStrategy(event.target.value as ImportDuplicateStrategy)
                  }
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
                >
                  <option value="SKIP">رد کردن ردیف تکراری</option>
                  <option value="UPDATE_EMPTY_FIELDS">فقط تکمیل فیلدهای خالی مجاز</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={validate}
              disabled={pending}
              className="mt-5 w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
            >
              {pending ? "در حال اعتبارسنجی…" : "اعتبارسنجی فایل"}
            </button>
          </Card>
        </>
      ) : null}

      {validation && phase === "validated" ? (
        <Card title="۵ و ۶. اعتبارسنجی و ورود اطلاعات">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-background p-4 text-sm">
              کل ردیف‌ها: <strong>{formatNumber(validation.total)}</strong>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              معتبر: <strong>{formatNumber(validation.valid)}</strong>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
              نامعتبر: <strong>{formatNumber(validation.invalid)}</strong>
            </div>
          </div>
          {validation.errors.length > 0 ? (
            <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-red-100">
              <ul className="divide-y divide-red-100 text-sm">
                {validation.errors.map((item) => (
                  <li key={item.excelRowNumber} className="px-4 py-3">
                    ردیف {formatNumber(item.excelRowNumber)}: {item.message}
                  </li>
                ))}
              </ul>
              {validation.invalid > validation.errors.length ? (
                <p className="px-4 py-3 text-xs text-muted">
                  فقط ۱۰۰ خطای نخست نمایش داده شده است؛ گزارش CSV نتیجه همه ردیف‌ها را دارد.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            هنگام ثبت، فایل دوباره روی سرور اعتبارسنجی و وضعیت تکراری‌ها مجدداً بررسی می‌شود.
          </div>
          <button
            type="button"
            onClick={execute}
            disabled={pending || validation.valid === 0 || !branchId}
            className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
          >
            {pending ? "در حال ورود اطلاعات…" : "تأیید و ورود اطلاعات"}
          </button>
        </Card>
      ) : null}

      {result && phase === "result" ? (
        <Card title="۷. گزارش نتیجه">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["کل", result.total],
              ["ایجاد", result.created],
              ["به‌روزرسانی", result.updated],
              ["ردشده", result.skipped],
              ["نامعتبر", result.invalid],
              ["خطا", result.failed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-background p-3 text-sm">
                <span className="block text-muted">{label}</span>
                <strong className="text-lg text-primary">{formatNumber(Number(value))}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white"
            >
              دریافت گزارش CSV
            </button>
            <Link
              href="/admin/leads"
              className="rounded-xl border border-border px-5 py-2.5 text-center text-sm"
            >
              مشاهده متقاضیان
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border px-5 py-2.5 text-sm"
            >
              ورود فایل دیگر
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
