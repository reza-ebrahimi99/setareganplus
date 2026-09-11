"use client";

import { useActionState, useMemo, useState } from "react";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import {
  createGuidanceDiscountAction,
  deleteGuidanceDiscountAction,
  toggleGuidanceDiscountAction,
  updateGuidanceDiscountAction,
  type DiscountAdminState,
} from "@/app/admin/(dashboard)/guidance/discounts/actions";
import {
  calculateGuidanceDiscount,
  rialToToman,
  tomanToRial,
} from "@/lib/guidance/discounts/engine";
import {
  GUIDANCE_DISCOUNT_STATUS_LABELS,
  deriveGuidanceDiscountStatus,
  type GuidanceDiscountDerivedStatus,
} from "@/lib/guidance/discounts/status";
import {
  GUIDANCE_DISCOUNT_PACKAGE_CODES,
  GUIDANCE_DISCOUNT_PACKAGE_LABELS,
  parsePackageScope,
  scopeIncludesPackage,
  scopeLabel,
} from "@/lib/guidance/discounts/packages";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type DiscountRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  packageScope: string;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usageCount: number;
  isActive: boolean;
  note: string | null;
};

type PreviewPackage = {
  code: string;
  title: string;
  priceRials: number;
};

type EditorMode = "create" | "bulk" | "edit";

function utcToYmd(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function randomDiscountCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}

function formatTomanFa(rials: number): string {
  return toPersianDigits(rialToToman(rials).toLocaleString("en-US"));
}

function valueLabel(row: DiscountRow): string {
  if (row.type === "PERCENTAGE") {
    return `${toPersianDigits(row.value)}٪`;
  }
  return `${formatTomanFa(row.value)} تومان`;
}

function validityLabel(row: DiscountRow): string {
  if (!row.startsAt && !row.endsAt) return "بدون محدودیت تاریخ";
  const start = row.startsAt ? formatJalaliDateShort(new Date(row.startsAt)) : "بدون شروع";
  const end = row.endsAt ? formatJalaliDateShort(new Date(row.endsAt)) : "نامحدود";
  return `${start} تا ${end}`;
}

function exportCsv(rows: DiscountRow[]) {
  const header = ["کد", "نوع", "مقدار", "بسته‌ها", "استفاده", "اعتبار", "وضعیت", "توضیحات"];
  const lines = rows.map((row) => {
    const status = deriveGuidanceDiscountStatus(row);
    return [
      row.code,
      row.type === "PERCENTAGE" ? "درصدی" : "مبلغ ثابت",
      row.type === "PERCENTAGE" ? `${row.value}%` : `${rialToToman(row.value)} تومان`,
      scopeLabel(parsePackageScope(row.packageScope)),
      `${row.usageCount}/${row.maxUses ?? "نامحدود"}`,
      validityLabel(row),
      GUIDANCE_DISCOUNT_STATUS_LABELS[status],
      row.note ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = `\uFEFF${[header.join(","), ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guidance-discount-codes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function DiscountPreview(props: {
  packages: PreviewPackage[];
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  percent: string;
  amountToman: string;
  scopeValues: string[];
}) {
  const numericValue =
    props.type === "PERCENTAGE" ? Number(props.percent) : Number(props.amountToman);
  const value =
    Number.isInteger(numericValue) && numericValue > 0
      ? props.type === "PERCENTAGE"
        ? numericValue
        : tomanToRial(numericValue)
      : 0;
  const scope = props.scopeValues.includes("ALL") || props.scopeValues.length === 0
    ? "ALL"
    : parsePackageScope(props.scopeValues.join(","));

  return (
    <div className="gdm-preview">
      <h3>پیش‌نمایش محاسبه روی بسته‌ها</h3>
      <div className="gdm-preview__grid">
        {props.packages.map((pkg) => {
          if (!scopeIncludesPackage(scope, pkg.code)) return null;
          const calc = calculateGuidanceDiscount({
            originalAmountRials: pkg.priceRials,
            type: props.type,
            value: Number.isInteger(value) ? value : 0,
          });
          return (
            <article key={pkg.code} className="gdm-preview__card">
              <strong>{pkg.title}</strong>
              <span>
                قیمت اصلی
                <b>{formatTomanFa(pkg.priceRials)} تومان</b>
              </span>
              {calc.ok ? (
                <>
                  <span>
                    {props.type === "PERCENTAGE"
                      ? `تخفیف ${toPersianDigits(props.percent || "0")}٪`
                      : "تخفیف ثابت"}
                    <b>{formatTomanFa(calc.result.discountAmountRials)} تومان</b>
                  </span>
                  <span className="gdm-preview__final">
                    مبلغ نهایی
                    <b>{formatTomanFa(calc.result.finalAmountRials)} تومان</b>
                  </span>
                </>
              ) : (
                <em>{calc.error}</em>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DiscountEditorForm(props: {
  mode: EditorMode;
  row?: DiscountRow;
  packages: PreviewPackage[];
  pending: boolean;
  state: DiscountAdminState;
  action: (formData: FormData) => void;
  onClose: () => void;
}) {
  const row = props.row;
  const [type, setType] = useState<"FIXED_AMOUNT" | "PERCENTAGE">(
    row?.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT",
  );
  const [code, setCode] = useState(row?.code ?? "");
  const [percent, setPercent] = useState(row?.type === "PERCENTAGE" ? String(row.value) : "");
  const [amountToman, setAmountToman] = useState(
    row && row.type !== "PERCENTAGE" ? String(rialToToman(row.value)) : "",
  );
  const initialScope = row ? parsePackageScope(row.packageScope) : "ALL";
  const [scopeValues, setScopeValues] = useState<string[]>(
    initialScope === "ALL" ? ["ALL"] : initialScope,
  );

  function toggleScope(value: string) {
    setScopeValues((current) => {
      if (value === "ALL") return ["ALL"];
      const next = current.filter((item) => item !== "ALL" && item !== value);
      if (!current.includes(value)) next.push(value);
      return next.length === 0 ? ["ALL"] : next;
    });
  }

  const title =
    props.mode === "edit"
      ? `ویرایش ${row?.code ?? ""}`
      : props.mode === "bulk"
        ? "تولید گروهی"
        : "کد تخفیف جدید";

  return (
    <div className="gdm-modal" role="dialog" aria-modal="true" aria-labelledby="gdm-editor-title">
      <button type="button" className="gdm-modal__backdrop" onClick={props.onClose} aria-label="بستن" />
      <form action={props.action} className="gdm-modal__card">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="gdm-modal__head">
          <div>
            <h2 id="gdm-editor-title">{title}</h2>
            <p>محاسبه پیش‌نمایش با همان موتور مالی پرداخت است.</p>
          </div>
          <button type="button" className="gdm-btn" onClick={props.onClose}>
            بستن
          </button>
        </div>

        <div className="gdm-editor">
          <label>
            کد تخفیف
            <div className="gdm-code-row">
              <input
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={props.mode === "bulk" ? "پیشوند اختیاری مثل SETA" : "SETAREGAN97"}
                autoComplete="off"
                dir="ltr"
              />
              {props.mode !== "bulk" ? (
                <button
                  type="button"
                  className="gdm-btn"
                  onClick={() => setCode(randomDiscountCode())}
                >
                  تولید تصادفی
                </button>
              ) : null}
            </div>
          </label>

          <div className="gdm-type-switch" role="group" aria-label="نوع تخفیف">
            <button
              type="button"
              className={type === "FIXED_AMOUNT" ? "is-active" : ""}
              onClick={() => setType("FIXED_AMOUNT")}
            >
              مبلغ ثابت
            </button>
            <button
              type="button"
              className={type === "PERCENTAGE" ? "is-active" : ""}
              onClick={() => setType("PERCENTAGE")}
            >
              درصدی
            </button>
            <input type="hidden" name="type" value={type} />
          </div>

          {type === "FIXED_AMOUNT" ? (
            <label>
              مقدار (تومان)
              <input
                name="amountToman"
                inputMode="numeric"
                value={amountToman}
                onChange={(event) => setAmountToman(event.target.value)}
                required
              />
            </label>
          ) : (
            <label>
              مقدار (درصد)
              <input
                name="percent"
                inputMode="numeric"
                value={percent}
                onChange={(event) => setPercent(event.target.value)}
                required
              />
            </label>
          )}

          <fieldset className="gdm-packages">
            <legend>بسته‌ها</legend>
            <label>
              <input
                type="checkbox"
                name="packageScope"
                value="ALL"
                checked={scopeValues.includes("ALL")}
                onChange={() => toggleScope("ALL")}
              />
              همه بسته‌ها
            </label>
            {GUIDANCE_DISCOUNT_PACKAGE_CODES.map((pkgCode) => (
              <label key={pkgCode}>
                <input
                  type="checkbox"
                  name="packageScope"
                  value={pkgCode}
                  checked={scopeValues.includes(pkgCode)}
                  onChange={() => toggleScope(pkgCode)}
                />
                {GUIDANCE_DISCOUNT_PACKAGE_LABELS[pkgCode]}
              </label>
            ))}
          </fieldset>

          <div>
            <p className="gdm-label">شروع اعتبار</p>
            <JalaliDateField
              id={`from-${row?.id ?? props.mode}`}
              name="startsAt"
              defaultValue={utcToYmd(row?.startsAt ?? null)}
            />
          </div>
          <div>
            <p className="gdm-label">پایان اعتبار</p>
            <JalaliDateField
              id={`until-${row?.id ?? props.mode}`}
              name="endsAt"
              defaultValue={utcToYmd(row?.endsAt ?? null)}
            />
          </div>
          <label>
            حداکثر استفاده
            <input name="maxUses" inputMode="numeric" defaultValue={row?.maxUses ? String(row.maxUses) : ""} />
          </label>
          <label>
            وضعیت
            <select name="isActive" defaultValue={row?.isActive === false ? "0" : "1"}>
              <option value="1">فعال</option>
              <option value="0">غیرفعال</option>
            </select>
          </label>
          <label className="gdm-span">
            توضیحات داخلی
            <input name="note" defaultValue={row?.note ?? ""} />
          </label>
          {props.mode === "bulk" ? (
            <label>
              تعداد تولید گروهی
              <input name="quantity" inputMode="numeric" defaultValue="10" />
            </label>
          ) : (
            <input type="hidden" name="quantity" value="1" />
          )}
        </div>

        <DiscountPreview
          packages={props.packages}
          type={type}
          percent={percent}
          amountToman={amountToman}
          scopeValues={scopeValues}
        />

        {props.state.error ? <p className="gdm-error">{props.state.error}</p> : null}
        {props.state.success ? <p className="gdm-success">{props.state.success}</p> : null}
        {props.state.codes?.length ? (
          <div className="gdm-generated">
            <button
              type="button"
              className="gdm-btn gdm-btn--primary"
              onClick={() => copyText(props.state.codes?.join("\n") ?? "")}
            >
              کپی همه کدها
            </button>
            <pre>{props.state.codes.join("\n")}</pre>
          </div>
        ) : null}

        <div className="gdm-actions">
          <button type="submit" className="gdm-btn gdm-btn--primary" disabled={props.pending}>
            {props.pending
              ? "در حال ذخیره…"
              : props.mode === "bulk"
                ? "تولید کدها"
                : props.mode === "edit"
                  ? "ذخیره تغییرات"
                  : "ثبت کد"}
          </button>
          <button type="button" className="gdm-btn" onClick={props.onClose}>
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}

export function DiscountCodeManager(props: {
  rows: DiscountRow[];
  packages: PreviewPackage[];
}) {
  const [createState, createAction, createPending] = useActionState(createGuidanceDiscountAction, {});
  const [updateState, updateAction, updatePending] = useActionState(updateGuidanceDiscountAction, {});
  const [toggleState, toggleAction] = useActionState(toggleGuidanceDiscountAction, {});
  const [deleteState, deleteAction] = useActionState(deleteGuidanceDiscountAction, {});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | GuidanceDiscountDerivedStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "FIXED_AMOUNT" | "PERCENTAGE">("all");
  const [packageFilter, setPackageFilter] = useState<"all" | string>("all");
  const [editor, setEditor] = useState<{ mode: EditorMode; id?: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return props.rows.filter((row) => {
      const derived = deriveGuidanceDiscountStatus(row);
      if (status !== "all" && derived !== status) return false;
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (packageFilter !== "all") {
        const scope = parsePackageScope(row.packageScope);
        if (!scopeIncludesPackage(scope, packageFilter)) return false;
      }
      if (!q) return true;
      return row.code.includes(q) || (row.note ?? "").toUpperCase().includes(q);
    });
  }, [props.rows, query, status, typeFilter, packageFilter]);

  const editingRow = editor?.mode === "edit"
    ? props.rows.find((row) => row.id === editor.id)
    : undefined;

  return (
    <div className="gdm" dir="rtl">
      <section className="gdm-panel gdm-panel--toolbar">
        <div className="gdm-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی کد"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            aria-label="وضعیت"
          >
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(GUIDANCE_DISCOUNT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            aria-label="نوع"
          >
            <option value="all">همه انواع</option>
            <option value="FIXED_AMOUNT">مبلغ ثابت</option>
            <option value="PERCENTAGE">درصدی</option>
          </select>
          <select
            value={packageFilter}
            onChange={(event) => setPackageFilter(event.target.value)}
            aria-label="بسته"
          >
            <option value="all">همه بسته‌ها</option>
            {GUIDANCE_DISCOUNT_PACKAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {GUIDANCE_DISCOUNT_PACKAGE_LABELS[code]}
              </option>
            ))}
          </select>
          <button type="button" className="gdm-btn" onClick={() => exportCsv(filtered)}>
            خروجی CSV
          </button>
        </div>
        <div className="gdm-actions">
          <button type="button" className="gdm-btn gdm-btn--primary" onClick={() => setEditor({ mode: "create" })}>
            کد تخفیف جدید
          </button>
          <button type="button" className="gdm-btn" onClick={() => setEditor({ mode: "bulk" })}>
            تولید گروهی
          </button>
        </div>
      </section>

      {toggleState.error || deleteState.error ? (
        <p className="gdm-error">{toggleState.error || deleteState.error}</p>
      ) : null}
      {toggleState.success || deleteState.success ? (
        <p className="gdm-success">{toggleState.success || deleteState.success}</p>
      ) : null}

      <section className="gdm-panel">
        <div className="gdm-table-wrap">
          <table className="gdm-table">
            <thead>
              <tr>
                <th>کد</th>
                <th>نوع</th>
                <th>مقدار</th>
                <th>بسته‌ها</th>
                <th>استفاده</th>
                <th>اعتبار</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>کدی مطابق این فیلتر نیست.</td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const derived = deriveGuidanceDiscountStatus(row);
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.code}</strong>
                      </td>
                      <td>{row.type === "PERCENTAGE" ? "درصدی" : "مبلغ ثابت"}</td>
                      <td>{valueLabel(row)}</td>
                      <td>{scopeLabel(parsePackageScope(row.packageScope))}</td>
                      <td>
                        {toPersianDigits(row.usageCount)}
                        {row.maxUses != null ? ` / ${toPersianDigits(row.maxUses)}` : ""}
                      </td>
                      <td>{validityLabel(row)}</td>
                      <td>
                        <span className={`gdm-status gdm-status--${derived}`}>
                          {GUIDANCE_DISCOUNT_STATUS_LABELS[derived]}
                        </span>
                      </td>
                      <td>
                        <div className="gdm-row-actions">
                          <button type="button" className="gdm-btn" onClick={() => copyText(row.code)}>
                            کپی
                          </button>
                          <button
                            type="button"
                            className="gdm-btn"
                            onClick={() => setEditor({ mode: "edit", id: row.id })}
                          >
                            ویرایش
                          </button>
                          <form action={toggleAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="isActive" value={row.isActive ? "0" : "1"} />
                            <button type="submit" className="gdm-btn">
                              {row.isActive ? "غیرفعال" : "فعال"}
                            </button>
                          </form>
                          <form
                            action={deleteAction}
                            onSubmit={(event) => {
                              if (!window.confirm("این کد حذف یا بایگانی شود؟")) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className="gdm-btn">
                              حذف
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editor?.mode === "create" || editor?.mode === "bulk" ? (
        <DiscountEditorForm
          mode={editor.mode}
          packages={props.packages}
          pending={createPending}
          state={createState}
          action={createAction}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {editor?.mode === "edit" && editingRow ? (
        <DiscountEditorForm
          mode="edit"
          row={editingRow}
          packages={props.packages}
          pending={updatePending}
          state={updateState}
          action={updateAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
