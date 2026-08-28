"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  executeCrmImportAction,
  inspectCrmImportAction,
  validateCrmImportAction,
  type ValidateImportActionResult,
} from "@/app/admin/(dashboard)/crm/import/actions";
import type { CrmImportResult } from "@/lib/crm/import-service";
import type { ImportAssignmentConfig } from "@/lib/crm/import-assignment";
import type {
  ImportColumnMapping,
  ImportDuplicateStrategy,
  ImportMappingField,
  WorkbookInspection,
} from "@/lib/crm/import-parser";
import type { LeadOwnerOption } from "@/lib/crm/lead-owners";

const CRM_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  branches: Array<{ id: string; name: string }>;
  owners: LeadOwnerOption[];
  canAssign: boolean;
  canImportDuplicates: boolean;
};

type Phase =
  | "upload"
  | "mapping"
  | "duplicates"
  | "preview"
  | "assignment"
  | "result";
type AssignmentMethod =
  | "NONE"
  | "SINGLE"
  | "EQUAL"
  | "ROUND_ROBIN"
  | "PERCENTAGE";

const STEPS = [
  "بارگذاری",
  "تطبیق ستون‌ها",
  "تشخیص تکراری",
  "پیش‌نمایش",
  "تخصیص",
  "ورود و گزارش",
] as const;

const FIELD_OPTIONS: Array<{ value: ImportMappingField; label: string }> = [
  { value: "IGNORE", label: "نادیده گرفتن" },
  { value: "firstName", label: "نام دانش‌آموز" },
  { value: "lastName", label: "نام خانوادگی دانش‌آموز" },
  { value: "fullName", label: "نام کامل دانش‌آموز" },
  { value: "fatherName", label: "نام والد / سرپرست" },
  { value: "mobile", label: "موبایل" },
  { value: "nationalCode", label: "کد ملی" },
  { value: "school", label: "مدرسه" },
  { value: "gradeLevel", label: "پایه تحصیلی" },
  { value: "studyField", label: "رشته" },
  { value: "city", label: "شهر" },
  { value: "province", label: "استان" },
  { value: "gender", label: "جنسیت" },
  { value: "birthDate", label: "تاریخ تولد" },
  { value: "source", label: "منبع" },
  { value: "description", label: "یادداشت" },
  { value: "email", label: "ایمیل" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function mappingStorageKey(inspection: WorkbookInspection): string {
  const signature = inspection.headers
    .map((header) => header.label.trim().toLocaleLowerCase("fa"))
    .join("|");
  return `crm-import-mapping:v1:${signature}`;
}

function defaultMapping(inspection: WorkbookInspection): ImportColumnMapping {
  const used = new Set<ImportMappingField>();
  return Object.fromEntries(
    inspection.headers.map((header) => {
      const suggested = header.suggestedField;
      if (suggested === "IGNORE" || used.has(suggested)) {
        return [String(header.column), "IGNORE"] as [
          string,
          ImportMappingField,
        ];
      }
      used.add(suggested);
      return [String(header.column), suggested] as [
        string,
        ImportMappingField,
      ];
    }),
  );
}

function savedMapping(
  raw: string,
  inspection: WorkbookInspection,
): ImportColumnMapping | null {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const allowedColumns = new Set(
    inspection.headers.map((header) => String(header.column)),
  );
  const allowedFields = new Set(FIELD_OPTIONS.map((option) => option.value));
  const usedFields = new Set<ImportMappingField>();
  const result: ImportColumnMapping = {};
  for (const [column, field] of Object.entries(parsed)) {
    if (
      !allowedColumns.has(column) ||
      typeof field !== "string" ||
      !allowedFields.has(field as ImportMappingField)
    ) {
      return null;
    }
    const typedField = field as ImportMappingField;
    if (typedField !== "IGNORE" && usedFields.has(typedField)) return null;
    if (typedField !== "IGNORE") usedFields.add(typedField);
    result[column] = typedField;
  }
  return result;
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

export function CrmImportWizard({
  branches,
  owners,
  canAssign,
  canImportDuplicates,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("upload");
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? branches[0]!.id : "",
  );
  const [strategy, setStrategy] = useState<ImportDuplicateStrategy>("SKIP");
  const [matchParentName, setMatchParentName] = useState(false);
  const [validation, setValidation] = useState<
    Extract<ValidateImportActionResult, { ok: true }>["summary"] | null
  >(null);
  const [assignmentMethod, setAssignmentMethod] =
    useState<AssignmentMethod>("NONE");
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CrmImportResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeStep = STEPS.indexOf(
    phase === "result" ? "ورود و گزارش" : ({
      upload: "بارگذاری",
      mapping: "تطبیق ستون‌ها",
      duplicates: "تشخیص تکراری",
      preview: "پیش‌نمایش",
      assignment: "تخصیص",
    } as const)[phase],
  );
  const visibleOwners = owners.filter(
    (owner) =>
      owner.branchIds.length === 0 ||
      !branchId ||
      owner.branchIds.includes(branchId),
  );
  function selectedFile(): File | null {
    return file;
  }

  function assignmentConfig(): ImportAssignmentConfig | null {
    if (!canAssign || assignmentMethod === "NONE") return { method: "NONE" };
    if (assignmentMethod === "SINGLE") {
      return selectedOwnerIds[0]
        ? { method: "SINGLE", ownerUserId: selectedOwnerIds[0] }
        : null;
    }
    if (assignmentMethod === "EQUAL" || assignmentMethod === "ROUND_ROBIN") {
      return selectedOwnerIds.length
        ? { method: assignmentMethod, ownerUserIds: selectedOwnerIds }
        : null;
    }
    const allocations = selectedOwnerIds.map((ownerUserId) => ({
      ownerUserId,
      percentage: percentages[ownerUserId] ?? 0,
    }));
    return allocations.length &&
      allocations.every(
        (item) =>
          Number.isInteger(item.percentage) &&
          item.percentage > 0 &&
          item.percentage <= 100,
      ) &&
      allocations.reduce((sum, item) => sum + item.percentage, 0) === 100
      ? { method: "PERCENTAGE", allocations }
      : null;
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
    formData.set("matchParentName", String(matchParentName));
    const assignment = assignmentConfig();
    if (assignment) formData.set("assignment", JSON.stringify(assignment));
    return formData;
  }

  function inspect(sheetName?: string) {
    const file = selectedFile();
    if (!file) {
      setError("لطفاً فایل را انتخاب کنید.");
      return;
    }
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (![".xlsx", ".csv"].includes(extension) || file.size > CRM_IMPORT_MAX_BYTES) {
      setError("فقط فایل XLSX/CSV تا حجم ۵ مگابایت مجاز است.");
      return;
    }
    const formData = formDataBase();
    if (!formData) return;
    if (sheetName) formData.set("sheetName", sheetName);
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        const response = await inspectCrmImportAction(formData);
        if (!response.ok) {
          setError(response.error);
          return;
        }
        const nextInspection = response.inspection;
        let nextMapping = defaultMapping(nextInspection);
        try {
          const saved = localStorage.getItem(mappingStorageKey(nextInspection));
          if (saved) {
            nextMapping = savedMapping(saved, nextInspection) ?? nextMapping;
          }
        } catch {
          // Fall back to detected mappings when browser storage is unavailable.
        }
        setInspection(nextInspection);
        setMapping(nextMapping);
        setValidation(null);
        setResult(null);
        setPhase("mapping");
      } catch {
        setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      }
    });
  }

  function validate(nextParentMatch = matchParentName) {
    if (!branchId) {
      setError("شعبه مقصد را انتخاب کنید.");
      return;
    }
    const formData = formDataBase();
    if (!formData) return;
    formData.set("matchParentName", String(nextParentMatch));
    setError("");
    startTransition(async () => {
      try {
        const response = await validateCrmImportAction(formData);
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setValidation(response.summary);
        setPhase("duplicates");
      } catch {
        setError("اعتبارسنجی فایل انجام نشد. دوباره تلاش کنید.");
      }
    });
  }

  function execute() {
    const config = assignmentConfig();
    if (!config) {
      setError("تنظیمات تخصیص کامل نیست؛ مجموع درصدها باید ۱۰۰٪ باشد.");
      return;
    }
    const formData = formDataBase();
    if (!formData) return;
    formData.set("assignment", JSON.stringify(config));
    setError("");
    startTransition(async () => {
      try {
        const response = await executeCrmImportAction(formData);
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setResult(response.result);
        setNotice(response.reportWarning ?? "");
        setPhase("result");
      } catch {
        setError("ورود اطلاعات انجام نشد. وضعیت شبکه را بررسی کنید.");
      }
    });
  }

  function updateMapping(column: number, field: ImportMappingField) {
    const next = { ...mapping };
    if (field !== "IGNORE") {
      for (const [key, currentField] of Object.entries(next)) {
        if (currentField === field) next[key] = "IGNORE";
      }
    }
    next[String(column)] = field;
    setMapping(next);
    setValidation(null);
    if (inspection) {
      try {
        localStorage.setItem(mappingStorageKey(inspection), JSON.stringify(next));
      } catch {
        // Import remains usable when browser storage is unavailable.
      }
    }
  }

  function toggleOwner(ownerUserId: string) {
    setSelectedOwnerIds((current) =>
      current.includes(ownerUserId)
        ? current.filter((id) => id !== ownerUserId)
        : [...current, ownerUserId],
    );
  }

  function reset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFile(null);
    setInspection(null);
    setMapping({});
    setValidation(null);
    setResult(null);
    setSelectedOwnerIds([]);
    setPercentages({});
    setAssignmentMethod("NONE");
    setStrategy("SKIP");
    setMatchParentName(false);
    setBranchId(branches.length === 1 ? branches[0]!.id : "");
    setError("");
    setNotice("");
    setPhase("upload");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="مراحل ورود">
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
      {notice ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </div>
      ) : null}
      {phase !== "upload" && phase !== "result" ? (
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          انتخاب فایل دیگر
        </button>
      ) : null}

      {phase === "upload" ? (
        <Card title="۱. بارگذاری فایل Excel یا CSV">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={pending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
            }}
            className="block w-full rounded-xl border border-border bg-white p-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-secondary/15 file:px-3 file:py-2"
          />
          <p className="mt-2 text-xs leading-6 text-muted">
            حداکثر ۵ مگابایت، ۱۰٬۰۰۰ ردیف و ۱۰۰ ستون.
          </p>
          <button type="button" onClick={() => inspect()} disabled={pending} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-50">
            {pending ? "در حال خواندن…" : "ادامه"}
          </button>
        </Card>
      ) : null}

      {phase === "mapping" && inspection ? (
        <Card title="۲. انتخاب شیت و تطبیق ستون‌ها">
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">شیت</span>
              <select value={inspection.selectedSheet} onChange={(event) => inspect(event.target.value)} className="w-full rounded-xl border border-border px-3 py-2">
                {inspection.worksheets.map((sheet) => (
                  <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">شعبه مقصد</span>
              <select value={branchId} onChange={(event) => {
                setBranchId(event.target.value);
                setSelectedOwnerIds([]);
              }} className="w-full rounded-xl border border-border px-3 py-2">
                <option value="">انتخاب شعبه</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inspection.headers.map((header) => (
              <label key={header.column} className="rounded-xl border border-border p-3 text-sm">
                <span className="mb-2 block truncate font-medium">{header.label}</span>
                <span className="mb-2 block truncate text-xs text-muted">
                  نمونه: {inspection.preview
                    .slice(0, 3)
                    .map((row) => row.cells[header.column - 1] || "—")
                    .join("، ")}
                </span>
                <select value={mapping[String(header.column)] ?? "IGNORE"} onChange={(event) => updateMapping(header.column, event.target.value as ImportMappingField)} className="w-full rounded-lg border border-border px-2 py-2">
                  {FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => validate()} disabled={pending} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-50">
            {pending ? "در حال بررسی…" : "بررسی اعتبار و تکراری‌ها"}
          </button>
        </Card>
      ) : null}

      {phase === "duplicates" && validation ? (
        <Card title="۳. تشخیص ردیف‌های تکراری">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4">لید جدید: <strong>{formatNumber(validation.newLeads)}</strong></div>
            <div className="rounded-xl bg-amber-50 p-4">تکراری: <strong>{formatNumber(validation.duplicates)}</strong></div>
            <div className="rounded-xl bg-red-50 p-4">نامعتبر: <strong>{formatNumber(validation.invalid)}</strong></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={matchParentName} onChange={(event) => {
              const checked = event.target.checked;
              setMatchParentName(checked);
              validate(checked);
            }} />
            برای تشخیص دقیق‌تر، نام والد/سرپرست نیز برابر باشد
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted">رفتار با تکراری‌ها</span>
            <select value={strategy} onChange={(event) => setStrategy(event.target.value as ImportDuplicateStrategy)} className="w-full max-w-xl rounded-xl border border-border px-3 py-2">
              <option value="SKIP">رد کردن تکراری‌ها</option>
              <option value="UPDATE_EMPTY_FIELDS">تکمیل فیلدهای خالی لید موجود</option>
              {canImportDuplicates ? <option value="IMPORT_ANYWAY">ورود به‌عنوان لید جدید (فقط مدیر)</option> : null}
            </select>
          </label>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setPhase("mapping")} className="rounded-xl border border-border px-4 py-2 text-sm">بازگشت</button>
            <button type="button" onClick={() => setPhase("preview")} className="rounded-xl bg-primary px-5 py-2 text-sm text-white">ادامه</button>
          </div>
        </Card>
      ) : null}

      {phase === "preview" && validation ? (
        <Card title="۴. پیش‌نمایش و خلاصه">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["کل", validation.total], ["معتبر", validation.valid], ["نامعتبر", validation.invalid], ["تکراری", validation.duplicates]].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border p-3"><span className="block text-xs text-muted">{label}</span><strong>{formatNumber(Number(value))}</strong></div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead><tr className="border-b border-border text-right"><th className="p-2">ردیف</th><th className="p-2">نام</th><th className="p-2">موبایل</th><th className="p-2">وضعیت</th><th className="p-2">پیام</th></tr></thead>
              <tbody>{validation.preview.map((row) => <tr key={row.excelRowNumber} className="border-b border-border/60"><td className="p-2">{formatNumber(row.excelRowNumber)}</td><td className="p-2">{row.name || "—"}</td><td className="p-2" dir="ltr">{row.mobile}</td><td className="p-2">{row.status === "NEW" ? "جدید" : row.status === "DUPLICATE" ? "تکراری" : "نامعتبر"}</td><td className="p-2">{row.message}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setPhase("duplicates")} className="rounded-xl border border-border px-4 py-2 text-sm">بازگشت</button>
            <button type="button" onClick={() => setPhase("assignment")} className="rounded-xl bg-primary px-5 py-2 text-sm text-white">ادامه</button>
          </div>
        </Card>
      ) : null}

      {phase === "assignment" && validation ? (
        <Card title="۵. تخصیص مسئول">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ["NONE", "بدون مسئول"],
              ["SINGLE", "همه برای یک مشاور"],
              ["EQUAL", "تقسیم مساوی"],
              ["ROUND_ROBIN", "گردشی"],
              ["PERCENTAGE", "درصدی"],
            ] as const).map(([value, label]) => (
              <label key={value} className={`rounded-xl border p-3 text-sm ${!canAssign && value !== "NONE" ? "opacity-50" : ""}`}>
                <input type="radio" name="assignmentMethod" value={value} checked={assignmentMethod === value} disabled={!canAssign && value !== "NONE"} onChange={() => {
                  setAssignmentMethod(value);
                  setSelectedOwnerIds([]);
                  setPercentages({});
                }} className="ml-2" />
                {label}
              </label>
            ))}
          </div>
          {assignmentMethod !== "NONE" ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visibleOwners.map((owner) => {
                const checked = selectedOwnerIds.includes(owner.id);
                return (
                  <label key={owner.id} className="rounded-xl border border-border p-3 text-sm">
                    <input type={assignmentMethod === "SINGLE" ? "radio" : "checkbox"} name="importOwners" checked={checked} onChange={() => assignmentMethod === "SINGLE" ? setSelectedOwnerIds([owner.id]) : toggleOwner(owner.id)} className="ml-2" />
                    {owner.name} <span className="text-xs text-muted">({owner.roleLabel})</span>
                    {assignmentMethod === "PERCENTAGE" && checked ? (
                      <input type="number" min="1" max="100" value={percentages[owner.id] ?? ""} onChange={(event) => setPercentages((current) => ({ ...current, [owner.id]: Number(event.target.value) }))} className="mt-2 w-full rounded-lg border border-border px-2 py-1" placeholder="درصد" />
                    ) : null}
                  </label>
                );
              })}
            </div>
          ) : null}
          {assignmentMethod === "PERCENTAGE" ? (
            <p className="mt-3 text-sm text-muted">مجموع درصدها: {formatNumber(selectedOwnerIds.reduce((sum, id) => sum + (percentages[id] ?? 0), 0))}٪ (باید ۱۰۰٪ باشد)</p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setPhase("preview")} className="rounded-xl border border-border px-4 py-2 text-sm">بازگشت</button>
            <button type="button" onClick={execute} disabled={pending || validation.valid === 0 || !assignmentConfig()} className="rounded-xl bg-emerald-700 px-5 py-2 text-sm text-white disabled:opacity-50">
              {pending ? "در حال ورود…" : "تأیید و شروع ورود"}
            </button>
          </div>
        </Card>
      ) : null}

      {phase === "result" && result ? (
        <Card title="۶. گزارش نهایی ورود">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[["کل", result.total], ["ایجاد", result.created], ["به‌روزرسانی", result.updated], ["ردشده", result.skipped], ["نامعتبر", result.invalid], ["خطا", result.failed], ["تکراری", result.duplicates]].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border p-3 text-sm"><span className="block text-muted">{label}</span><strong className="text-lg">{formatNumber(Number(value))}</strong></div>
            ))}
          </div>
          <h3 className="mt-5 font-semibold">توزیع مسئولان</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.ownerDistribution.map((item) => <li key={item.ownerUserId ?? "none"} className="flex justify-between rounded-xl border border-border p-3 text-sm"><span>{item.ownerName}</span><strong>{formatNumber(item.count)}</strong></li>)}
          </ul>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([result.csv], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `crm-import-${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-xl bg-primary px-5 py-2 text-center text-sm text-white"
            >
              دریافت CSV گزارش
            </button>
            <Link href="/admin/leads" className="rounded-xl border border-border px-5 py-2 text-center text-sm">مشاهده لیدها</Link>
            <button type="button" onClick={reset} className="rounded-xl border border-border px-5 py-2 text-sm">ورود فایل دیگر</button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
