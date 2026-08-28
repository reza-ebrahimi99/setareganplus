"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  executeAssessmentImportAction,
  inspectAssessmentImportAction,
  validateAssessmentImportAction,
} from "@/app/admin/(dashboard)/website/assessment-results/actions";
import {
  ASSESSMENT_IMPORT_MAX_BYTES,
  type AssessmentColumnMapping,
  type AssessmentImportField,
  type AssessmentImportResult,
  type ValidatedImportRow,
  type WorkbookInspection,
} from "@/lib/assessment/import-shared";
import { toPersianDigits } from "@/lib/persian";

type Props = {
  assessments: Array<{ id: string; title: string }>;
  subjects: Array<{ id: string; name: string }>;
  initialAssessmentId?: string;
};

type Phase = "upload" | "mapping" | "validation" | "preview" | "result";

const STEPS = [
  "بارگذاری",
  "تطبیق ستون‌ها",
  "اعتبارسنجی",
  "پیش‌نمایش",
  "ورود",
] as const;

const FIELD_OPTIONS: Array<{ value: AssessmentImportField; label: string }> = [
  { value: "IGNORE", label: "نادیده گرفتن" },
  { value: "kanoonStudentId", label: "شناسه قلم‌چی / شمارنده" },
  { value: "studentSlug", label: "اسلاگ دانش‌آموز" },
  { value: "fullName", label: "نام کامل" },
  { value: "firstName", label: "نام" },
  { value: "lastName", label: "نام خانوادگی" },
  { value: "score", label: "نمره" },
  { value: "scaledScore", label: "تراز" },
  { value: "rankSchool", label: "رتبه مدرسه" },
  { value: "rankCity", label: "رتبه شهر" },
  { value: "rankProvince", label: "رتبه استان" },
  { value: "rankCountry", label: "رتبه کشور" },
  { value: "percentile", label: "صدک / درصد" },
  { value: "growth", label: "رشد" },
  { value: "averageClass", label: "میانگین کلاس" },
  { value: "averageGrade", label: "میانگین پایه" },
  { value: "notes", label: "یادداشت" },
  { value: "isFeatured", label: "ویژه" },
];

function matchedByLabel(
  matchedBy: "kanoon" | "name_grade" | "slug" | "name" | "not_found" | undefined,
): string {
  switch (matchedBy) {
    case "kanoon":
      return "تطبیق با شناسه قلم‌چی";
    case "name_grade":
      return "تطبیق با نام + پایه";
    case "slug":
      return "تطبیق با اسلاگ";
    case "name":
      return "تطبیق با نام";
    case "not_found":
      return "یافت نشد";
    default:
      return "—";
  }
}

function mappingStorageKey(inspection: WorkbookInspection): string {
  const signature = inspection.headers
    .map((header) => header.label.trim().toLocaleLowerCase("fa"))
    .join("|");
  return `assessment-import-mapping:v1:${signature}`;
}

function defaultMapping(inspection: WorkbookInspection): AssessmentColumnMapping {
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

export function AssessmentImportWizard({
  assessments,
  subjects,
  initialAssessmentId,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState(initialAssessmentId ?? "");
  const [sheetName, setSheetName] = useState("");
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null);
  const [mapping, setMapping] = useState<AssessmentColumnMapping>({});
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [importSubmitted, setImportSubmitted] = useState(false);
  const [importResult, setImportResult] =
    useState<AssessmentImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const phaseOrder: Phase[] = [
    "upload",
    "mapping",
    "validation",
    "preview",
    "result",
  ];
  const stepIndex = phaseOrder.indexOf(phase);

  const allFieldOptions = useMemo(
    () => [
      ...FIELD_OPTIONS.map((option) => ({
        value: option.value as string,
        label: option.label,
      })),
      ...subjects.map((subject) => ({
        value: `subject:${subject.id}`,
        label: `درس: ${subject.name}`,
      })),
    ],
    [subjects],
  );

  function withFile(callback: (file: File, formData: FormData) => void) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("لطفاً فایل را انتخاب کنید.");
      return;
    }
    if (file.size > ASSESSMENT_IMPORT_MAX_BYTES) {
      setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    if (sheetName) formData.set("sheetName", sheetName);
    if (assessmentId) formData.set("assessmentId", assessmentId);
    formData.set("mapping", JSON.stringify(mapping));
    callback(file, formData);
  }

  function handleInspect() {
    setError(null);
    withFile((_file, formData) => {
      startTransition(async () => {
        const result = await inspectAssessmentImportAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
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
              ...(JSON.parse(stored) as AssessmentColumnMapping),
            };
          }
        } catch {
          /* ignore */
        }
        setMapping(nextMapping);
        setPhase("mapping");
      });
    });
  }

  function handleValidate() {
    setError(null);
    if (!assessmentId) {
      setError("آزمون مقصد را انتخاب کنید.");
      return;
    }
    withFile((_file, formData) => {
      startTransition(async () => {
        if (inspection) {
          localStorage.setItem(
            mappingStorageKey(inspection),
            JSON.stringify(mapping),
          );
        }
        const result = await validateAssessmentImportAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRows(result.rows);
        setValidCount(result.validCount);
        setInvalidCount(result.invalidCount);
        setDuplicateCount(result.duplicateCount);
        setTotalRows(result.totalRows);
        setImportSubmitted(false);
        setPhase("validation");
      });
    });
  }

  function handleImport() {
    setError(null);
    if (importSubmitted || pending || validCount === 0) return;
    setImportSubmitted(true);
    withFile((_file, formData) => {
      startTransition(async () => {
        const result = await executeAssessmentImportAction(formData);
        if (!result.ok) {
          setImportSubmitted(false);
          setError(result.error);
          return;
        }
        setImportResult(result.result);
        setPhase("result");
      });
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
                : "bg-surface text-muted border border-border"
            }`}
          >
            {toPersianDigits(index + 1)}. {label}
          </li>
        ))}
      </ol>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="admin-card space-y-4 p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">
            آزمون مقصد
          </span>
          <select
            value={assessmentId}
            onChange={(event) => setAssessmentId(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
            disabled={phase === "result"}
          >
            <option value="">انتخاب آزمون</option>
            {assessments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">
            فایل Excel / CSV
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full text-sm"
            disabled={phase === "result"}
          />
        </label>

        {inspection && inspection.sheets.length > 1 ? (
          <label className="block text-sm">
            <span className="mb-1 block text-muted">برگه</span>
            <select
              value={sheetName}
              onChange={(event) => setSheetName(event.target.value)}
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

        {phase === "upload" ? (
          <button
            type="button"
            onClick={handleInspect}
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            {pending ? "در حال خواندن…" : "ادامه به تطبیق ستون‌ها"}
          </button>
        ) : null}

        {phase === "mapping" && inspection ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {toPersianDigits(inspection.rowCount)} ردیف داده شناسایی شد.
            </p>
            <div className="space-y-3">
              {inspection.headers.map((header) => (
                <label key={header.column} className="block text-sm">
                  <span className="mb-1 block text-muted">{header.label}</span>
                  <select
                    value={mapping[String(header.column)] ?? "IGNORE"}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [String(header.column)]: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    {allFieldOptions.map((option) => (
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
                {pending ? "در حال اعتبارسنجی…" : "اعتبارسنجی"}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "validation" || phase === "preview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted">کل ردیف‌ها</p>
                <p className="text-xl font-bold text-primary">
                  {toPersianDigits(totalRows)}
                </p>
              </div>
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted">ردیف معتبر</p>
                <p className="text-xl font-bold text-primary">
                  {toPersianDigits(validCount)}
                </p>
              </div>
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted">ردیف نامعتبر</p>
                <p className="text-xl font-bold text-primary">
                  {toPersianDigits(invalidCount)}
                </p>
              </div>
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-muted">تکراری در فایل</p>
                <p className="text-xl font-bold text-primary">
                  {toPersianDigits(duplicateCount)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-2 py-2 text-right">ردیف</th>
                    <th className="px-2 py-2 text-right">دانش‌آموز</th>
                    <th className="px-2 py-2 text-right">شناسه قلم‌چی</th>
                    <th className="px-2 py-2 text-right">نحوه تطبیق</th>
                    <th className="px-2 py-2 text-right">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 40).map((row) => (
                    <tr key={row.excelRow} className="border-b border-border/70">
                      <td className="px-2 py-2">
                        {toPersianDigits(row.excelRow)}
                      </td>
                      <td className="px-2 py-2">
                        {row.ok
                          ? row.studentName
                          : [row.data.firstName, row.data.lastName]
                              .filter(Boolean)
                              .join(" ") ||
                            row.data.fullName ||
                            "—"}
                      </td>
                      <td className="px-2 py-2" dir="ltr">
                        {row.ok
                          ? row.kanoonStudentId
                            ? toPersianDigits(row.kanoonStudentId)
                            : "—"
                          : row.kanoonStudentId
                            ? toPersianDigits(row.kanoonStudentId)
                            : row.data.kanoonStudentId
                              ? toPersianDigits(row.data.kanoonStudentId)
                              : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {matchedByLabel(
                          row.ok ? row.matchedBy : row.matchedBy ?? "not_found",
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {row.ok ? "معتبر" : row.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                  onClick={() => setPhase("preview")}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm"
                >
                  پیش‌نمایش نهایی
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={pending || importSubmitted || validCount === 0}
                  className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm text-white disabled:opacity-60"
                >
                  {pending || importSubmitted
                    ? "در حال ورود…"
                    : "شروع ورود"}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {phase === "result" && importResult ? (
          <div className="space-y-4">
            <p className="text-sm leading-7">
              کل {toPersianDigits(importResult.totalRows)} ردیف —{" "}
              {toPersianDigits(importResult.imported)} جدید،{" "}
              {toPersianDigits(importResult.updated)} به‌روزرسانی،{" "}
              {toPersianDigits(importResult.restored)} بازیابی از حذف نرم،{" "}
              {toPersianDigits(importResult.skipped)} رد شد
              {importResult.duplicateRows > 0
                ? ` (از جمله ${toPersianDigits(importResult.duplicateRows)} تکراری در فایل)`
                : ""}
              .
            </p>
            {importResult.errors.length > 0 ? (
              <ul className="space-y-1 text-sm text-red-800">
                {importResult.errors.slice(0, 20).map((item) => (
                  <li key={`${item.excelRow}-${item.error}`}>
                    ردیف {toPersianDigits(item.excelRow)}: {item.error}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/admin/website/assessment-results"
              className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
            >
              بازگشت به نتایج
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
