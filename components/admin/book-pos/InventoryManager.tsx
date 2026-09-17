"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adjustStockAction,
  listStockMovementsAction,
} from "@/app/admin/(dashboard)/book-pos/actions";
import type { PosInventoryRow, PosStockMovementRow } from "@/lib/commerce/pos/inventory";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

const REASON_LABELS: Record<string, string> = {
  INITIAL: "موجودی اولیه",
  RESTOCK: "افزایش",
  SALE: "فروش",
  CORRECTION: "اصلاح",
  IMPORT: "ورود اکسل",
  RETURN: "مرجوعی",
};

export function InventoryManager({ rows }: { rows: PosInventoryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [mode, setMode] = useState<"increase" | "set">("increase");
  const [value, setValue] = useState("");
  const [movementsFor, setMovementsFor] = useState<string | null>(null);
  const [movements, setMovements] = useState<PosStockMovementRow[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("fa");
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLocaleLowerCase("fa").includes(needle) ||
        r.internalCode.toLowerCase().includes(needle) ||
        (r.barcode ?? "").toLowerCase().includes(needle),
    );
  }, [q, rows]);

  function openAdjust(rowId: string) {
    setActiveRow(rowId);
    setMode("increase");
    setValue("");
    setError("");
  }

  function submitAdjust(bookSkuId: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("مقدار باید عددی صحیح و نامنفی باشد.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await adjustStockAction({ bookSkuId, mode, value: parsed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setActiveRow(null);
      setValue("");
      router.refresh();
    });
  }

  function toggleMovements(bookSkuId: string) {
    if (movementsFor === bookSkuId) {
      setMovementsFor(null);
      setMovements([]);
      return;
    }
    setMovementsFor(bookSkuId);
    setMovements([]);
    startTransition(async () => {
      const rows = await listStockMovementsAction(bookSkuId);
      setMovements(rows);
    });
  }

  return (
    <section className="admin-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-primary">موجودی کتاب‌ها</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو…"
          className="min-w-48 rounded-xl border border-border bg-background px-4 py-2 text-sm text-primary"
        />
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-right text-xs text-muted">
              <th className="px-3 py-2 font-medium">کتاب</th>
              <th className="px-3 py-2 font-medium">قیمت</th>
              <th className="px-3 py-2 font-medium">ورودی</th>
              <th className="px-3 py-2 font-medium">فروخته</th>
              <th className="px-3 py-2 font-medium">موجودی</th>
              <th className="px-3 py-2 font-medium">وضعیت</th>
              <th className="px-3 py-2 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                  کتابی یافت نشد.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <span className="block font-semibold text-primary">{row.title}</span>
                      <span className="block text-xs text-muted" dir="ltr">
                        {row.internalCode}
                        {row.barcode ? ` · ${row.barcode}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{formatRials(row.priceRials)}</td>
                    <td className="px-3 py-2 text-muted">{toPersianDigits(row.received)}</td>
                    <td className="px-3 py-2 text-muted">{toPersianDigits(row.sold)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.lowStock
                            ? "font-bold text-danger"
                            : "font-semibold text-primary"
                        }
                      >
                        {row.currentStock == null
                          ? "نامحدود"
                          : toPersianDigits(row.currentStock)}
                      </span>
                      {row.lowStock ? (
                        <span className="ms-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger">
                          کم
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.isActive
                            ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-600"
                            : "rounded-full bg-slate-400/10 px-2 py-0.5 text-[11px] text-muted"
                        }
                      >
                        {row.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openAdjust(row.id)}
                          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-primary"
                        >
                          موجودی
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMovements(row.id)}
                          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted"
                        >
                          حرکات
                        </button>
                      </div>
                    </td>
                  </tr>
                  {activeRow === row.id ? (
                    <tr className="border-b border-border bg-background/60">
                      <td colSpan={7} className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setMode("increase")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                mode === "increase"
                                  ? "bg-secondary/20 text-primary"
                                  : "bg-surface text-muted"
                              }`}
                            >
                              افزایش
                            </button>
                            <button
                              type="button"
                              onClick={() => setMode("set")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                mode === "set"
                                  ? "bg-secondary/20 text-primary"
                                  : "bg-surface text-muted"
                              }`}
                            >
                              اصلاح به مقدار
                            </button>
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={mode === "increase" ? "تعداد افزوده" : "موجودی نهایی"}
                            className="w-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => submitAdjust(row.id)}
                            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            ثبت
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveRow(null)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
                          >
                            انصراف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {movementsFor === row.id ? (
                    <tr className="border-b border-border bg-background/40">
                      <td colSpan={7} className="px-3 py-3">
                        {movements.length === 0 ? (
                          <p className="text-xs text-muted">
                            {pending ? "در حال بارگذاری…" : "حرکتی ثبت نشده است."}
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-right text-muted">
                                <th className="py-1">تاریخ</th>
                                <th className="py-1">نوع</th>
                                <th className="py-1">تغییر</th>
                                <th className="py-1">موجودی پس از</th>
                                <th className="py-1">فاکتور</th>
                                <th className="py-1">کاربر</th>
                              </tr>
                            </thead>
                            <tbody>
                              {movements.map((m) => (
                                <tr key={m.id} className="border-t border-border/50">
                                  <td className="py-1 text-muted">
                                    {new Date(m.createdAt).toLocaleString("fa-IR")}
                                  </td>
                                  <td className="py-1 text-primary">
                                    {REASON_LABELS[m.reason] ?? m.reason}
                                  </td>
                                  <td
                                    className={`py-1 font-semibold ${
                                      m.delta < 0 ? "text-danger" : "text-emerald-600"
                                    }`}
                                    dir="ltr"
                                  >
                                    {m.delta > 0 ? "+" : ""}
                                    {toPersianDigits(m.delta)}
                                  </td>
                                  <td className="py-1 text-muted">
                                    {toPersianDigits(m.balanceAfter)}
                                  </td>
                                  <td className="py-1 text-muted" dir="ltr">
                                    {m.orderNumber ?? "—"}
                                  </td>
                                  <td className="py-1 text-muted">{m.actorName ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
