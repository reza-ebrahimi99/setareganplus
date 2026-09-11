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
  GUIDANCE_DISCOUNT_PACKAGE_CODES,
  GUIDANCE_DISCOUNT_PACKAGE_LABELS,
  parsePackageScope,
  scopeLabel,
} from "@/lib/guidance/discounts/packages";
import { rialsToToman } from "@/lib/guidance/discounts/money";
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

function validityLabel(row: DiscountRow): string {
  if (!row.startsAt && !row.endsAt) return "بدون محدودیت تاریخ";
  const start = row.startsAt ? formatJalaliDateShort(new Date(row.startsAt)) : "بدون شروع";
  const end = row.endsAt ? formatJalaliDateShort(new Date(row.endsAt)) : "نامحدود";
  return `${start} تا ${end}`;
}

function valueLabel(row: DiscountRow): string {
  if (row.type === "PERCENTAGE") {
    return `${toPersianDigits(row.value)}٪`;
  }
  return `${toPersianDigits(rialsToToman(row.value).toLocaleString("en-US"))} تومان`;
}

function FormFields(props: { row?: DiscountRow; bulk?: boolean }) {
  const row = props.row;
  const [type, setType] = useState(row?.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED_AMOUNT");
  const scope = row ? parsePackageScope(row.packageScope) : "ALL";
  const selected = scope === "ALL" ? ["ALL"] : scope;

  return (
    <div className="gdm-form-grid">
      <label>
        کد تخفیف
        <input
          name="code"
          defaultValue={row?.code ?? ""}
          placeholder={props.bulk ? "پیشوند اختیاری مثل SETA" : "SETAREGAN500"}
          autoComplete="off"
        />
      </label>
      <fieldset className="gdm-type">
        <legend>نوع تخفیف</legend>
        <label>
          <input
            type="radio"
            name="type"
            value="FIXED_AMOUNT"
            checked={type === "FIXED_AMOUNT"}
            onChange={() => setType("FIXED_AMOUNT")}
          />
          مبلغ ثابت
        </label>
        <label>
          <input
            type="radio"
            name="type"
            value="PERCENTAGE"
            checked={type === "PERCENTAGE"}
            onChange={() => setType("PERCENTAGE")}
          />
          درصدی
        </label>
      </fieldset>
      {type === "FIXED_AMOUNT" ? (
        <label>
          مبلغ تخفیف (تومان)
          <input
            name="amountToman"
            inputMode="numeric"
            defaultValue={row && row.type !== "PERCENTAGE" ? String(rialsToToman(row.value)) : ""}
            required
          />
        </label>
      ) : (
        <label>
          درصد تخفیف
          <input
            name="percent"
            inputMode="numeric"
            defaultValue={row?.type === "PERCENTAGE" ? String(row.value) : ""}
            required
          />
        </label>
      )}
      <fieldset className="gdm-packages">
        <legend>محدوده بسته</legend>
        <label>
          <input type="checkbox" name="packageScope" value="ALL" defaultChecked={selected.includes("ALL")} />
          همه بسته‌ها
        </label>
        {GUIDANCE_DISCOUNT_PACKAGE_CODES.map((code) => (
          <label key={code}>
            <input
              type="checkbox"
              name="packageScope"
              value={code}
              defaultChecked={selected.includes(code)}
            />
            {GUIDANCE_DISCOUNT_PACKAGE_LABELS[code]}
          </label>
        ))}
      </fieldset>
      <div>
        <p className="gdm-label">تاریخ شروع</p>
        <JalaliDateField id={`from-${row?.id ?? "new"}`} name="startsAt" defaultValue={utcToYmd(row?.startsAt ?? null)} />
      </div>
      <div>
        <p className="gdm-label">تاریخ پایان</p>
        <JalaliDateField id={`until-${row?.id ?? "new"}`} name="endsAt" defaultValue={utcToYmd(row?.endsAt ?? null)} />
      </div>
      <label>
        حداکثر تعداد استفاده
        <input name="maxUses" inputMode="numeric" defaultValue={row?.maxUses ? String(row.maxUses) : ""} />
      </label>
      <label className="gdm-span">
        توضیحات داخلی
        <input name="note" defaultValue={row?.note ?? ""} />
      </label>
      <label>
        وضعیت
        <select name="isActive" defaultValue={row?.isActive === false ? "0" : "1"}>
          <option value="1">فعال</option>
          <option value="0">غیرفعال</option>
        </select>
      </label>
      {props.bulk ? (
        <label>
          تعداد تولید گروهی
          <input name="quantity" inputMode="numeric" defaultValue="10" />
        </label>
      ) : (
        <input type="hidden" name="quantity" value="1" />
      )}
    </div>
  );
}

export function DiscountCodeManager(props: { rows: DiscountRow[] }) {
  const [createState, createAction, createPending] = useActionState(createGuidanceDiscountAction, {});
  const [updateState, updateAction, updatePending] = useActionState(updateGuidanceDiscountAction, {});
  const [toggleState, toggleAction] = useActionState(toggleGuidanceDiscountAction, {});
  const [deleteState, deleteAction] = useActionState(deleteGuidanceDiscountAction, {});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return props.rows.filter((row) => {
      if (status === "active" && !row.isActive) return false;
      if (status === "inactive" && row.isActive) return false;
      if (!q) return true;
      return row.code.includes(q) || (row.note ?? "").includes(query.trim());
    });
  }, [props.rows, query, status]);

  const allCodes = filtered.map((row) => row.code).join("\n");

  return (
    <div className="gdm" dir="rtl">
      <form action={createAction} className="gdm-panel">
        <div className="gdm-panel__head">
          <h2>{bulk ? "تولید گروهی کد" : "ثبت کد تخفیف"}</h2>
          <button type="button" className="gdm-btn" onClick={() => setBulk((value) => !value)}>
            {bulk ? "ثبت تکی" : "تولید گروهی کد"}
          </button>
        </div>
        <FormFields bulk={bulk} />
        {createState.error ? <p className="gdm-error">{createState.error}</p> : null}
        {createState.success ? <p className="gdm-success">{createState.success}</p> : null}
        {createState.codes?.length ? (
          <div className="gdm-generated">
            <button
              type="button"
              className="gdm-btn gdm-btn--primary"
              onClick={() => copyText(createState.codes?.join("\n") ?? "")}
            >
              کپی همه کدها
            </button>
            <pre>{createState.codes.join("\n")}</pre>
          </div>
        ) : null}
        <div className="gdm-actions">
          <button type="submit" className="gdm-btn gdm-btn--primary" disabled={createPending}>
            {createPending ? "در حال ثبت…" : bulk ? "تولید کدها" : "ثبت کد"}
          </button>
          <button
            type="button"
            className="gdm-btn"
            onClick={(event) => {
              const form = (event.target as HTMLButtonElement).form;
              const input = form?.elements.namedItem("code") as HTMLInputElement | null;
              if (!input) return;
              const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let code = "";
              const bytes = new Uint8Array(8);
              crypto.getRandomValues(bytes);
              for (const byte of bytes) code += alphabet[byte % alphabet.length];
              input.value = code;
            }}
          >
            تولید کد تصادفی
          </button>
        </div>
      </form>

      <section className="gdm-panel">
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
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
          <button type="button" className="gdm-btn" onClick={() => copyText(allCodes)}>
            کپی همه کدها
          </button>
          <a
            className="gdm-btn"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(
              ["code,type,value,packages,uses,status", ...filtered.map((row) =>
                [row.code, row.type, row.value, row.packageScope, `${row.usageCount}/${row.maxUses ?? ""}`, row.isActive ? "active" : "inactive"].join(","),
              )].join("\n"),
            )}`}
            download="guidance-discount-codes.csv"
          >
            خروجی CSV
          </a>
        </div>
        {updateState.error || toggleState.error || deleteState.error ? (
          <p className="gdm-error">{updateState.error || toggleState.error || deleteState.error}</p>
        ) : null}
        {updateState.success || toggleState.success || deleteState.success ? (
          <p className="gdm-success">
            {updateState.success || toggleState.success || deleteState.success}
          </p>
        ) : null}

        <div className="gdm-table-wrap">
          <table className="gdm-table">
            <thead>
              <tr>
                <th>کد</th>
                <th>نوع</th>
                <th>مقدار تخفیف</th>
                <th>بسته‌ها</th>
                <th>تعداد استفاده</th>
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
                filtered.map((row) => (
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
                    <td>{row.isActive ? "فعال" : "غیرفعال"}</td>
                    <td>
                      <div className="gdm-row-actions">
                        <button type="button" className="gdm-btn" onClick={() => copyText(row.code)}>
                          کپی
                        </button>
                        <button type="button" className="gdm-btn" onClick={() => setEditing(row.id)}>
                          ویرایش
                        </button>
                        <form action={toggleAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="isActive" value={row.isActive ? "0" : "1"} />
                          <button type="submit" className="gdm-btn">
                            {row.isActive ? "غیرفعال" : "فعال"}
                          </button>
                        </form>
                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button type="submit" className="gdm-btn">
                            حذف
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing
        ? props.rows
            .filter((row) => row.id === editing)
            .map((row) => (
              <form key={row.id} action={updateAction} className="gdm-panel">
                <h2>ویرایش {row.code}</h2>
                <input type="hidden" name="id" value={row.id} />
                <FormFields row={row} />
                <div className="gdm-actions">
                  <button type="submit" className="gdm-btn gdm-btn--primary" disabled={updatePending}>
                    ذخیره تغییرات
                  </button>
                  <button type="button" className="gdm-btn" onClick={() => setEditing(null)}>
                    انصراف
                  </button>
                </div>
              </form>
            ))
        : null}
    </div>
  );
}
