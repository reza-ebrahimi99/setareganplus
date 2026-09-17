"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  registerPosSaleAction,
  searchPosBooksAction,
  searchPosStudentsAction,
} from "@/app/admin/(dashboard)/book-pos/actions";
import type { PosBookOption, PosStudentOption } from "@/lib/commerce/pos/sale";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

type CartLine = {
  bookSkuId: string;
  title: string;
  internalCode: string;
  priceRials: number;
  quantity: number;
  currentStock: number | null;
  unlimitedStock: boolean;
};

type Receipt = {
  invoiceNumber: string;
  grandTotalRials: number;
  buyerName: string;
  lines: { title: string; quantity: number; priceRials: number }[];
  at: string;
};

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "CASH", label: "نقدی" },
  { value: "CARD", label: "کارت‌خوان" },
  { value: "TRANSFER", label: "کارت به کارت" },
];

export function PosTerminal() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<PosBookOption[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<PosStudentOption[]>([]);
  const [student, setStudent] = useState<PosStudentOption | null>(null);
  const [manualName, setManualName] = useState("");
  const [mobile, setMobile] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const searchSeq = useRef(0);

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.priceRials * l.quantity, 0),
    [cart],
  );

  function runBookSearch(q: string) {
    setBookQuery(q);
    const seq = ++searchSeq.current;
    startTransition(async () => {
      const results = await searchPosBooksAction(q);
      if (seq === searchSeq.current) setBookResults(results);
    });
  }

  function runStudentSearch(q: string) {
    setStudentQuery(q);
    startTransition(async () => {
      const results = await searchPosStudentsAction(q);
      setStudentResults(results);
    });
  }

  function stockCap(line: Pick<CartLine, "currentStock" | "unlimitedStock">): number {
    if (line.unlimitedStock || line.currentStock == null) return Number.MAX_SAFE_INTEGER;
    return line.currentStock;
  }

  function addBook(book: PosBookOption) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((l) => l.bookSkuId === book.id);
      if (existing) {
        const cap = stockCap(existing);
        if (existing.quantity >= cap) {
          setError(`موجودی «${book.title}» کافی نیست.`);
          return prev;
        }
        return prev.map((l) =>
          l.bookSkuId === book.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      if (!book.unlimitedStock && (book.currentStock ?? 0) < 1) {
        setError(`«${book.title}» ناموجود است.`);
        return prev;
      }
      return [
        ...prev,
        {
          bookSkuId: book.id,
          title: book.title,
          internalCode: book.internalCode,
          priceRials: book.priceRials,
          quantity: 1,
          currentStock: book.currentStock,
          unlimitedStock: book.unlimitedStock,
        },
      ];
    });
  }

  function setQuantity(bookSkuId: string, quantity: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.bookSkuId !== bookSkuId) return [l];
        if (quantity <= 0) return [];
        const cap = stockCap(l);
        return [{ ...l, quantity: Math.min(quantity, cap) }];
      }),
    );
  }

  function removeLine(bookSkuId: string) {
    setCart((prev) => prev.filter((l) => l.bookSkuId !== bookSkuId));
  }

  function reset() {
    setCart([]);
    setStudent(null);
    setManualName("");
    setMobile("");
    setBookQuery("");
    setBookResults([]);
    setStudentQuery("");
    setStudentResults([]);
    setPaymentMethod("CASH");
    setError("");
    setReceipt(null);
  }

  function submit() {
    setError("");
    if (cart.length === 0) {
      setError("سبد خرید خالی است.");
      return;
    }
    const buyerName = student ? student.fullName : manualName.trim();
    if (!buyerName) {
      setError("دانش‌آموز را انتخاب یا نام خریدار را وارد کنید.");
      return;
    }
    startTransition(async () => {
      const result = await registerPosSaleAction({
        lines: cart.map((l) => ({ bookSkuId: l.bookSkuId, quantity: l.quantity })),
        studentId: student?.id ?? null,
        buyerName: student ? null : buyerName,
        buyerMobile: mobile.trim() || null,
        paymentMethod,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReceipt({
        invoiceNumber: result.invoiceNumber,
        grandTotalRials: result.grandTotalRials,
        buyerName,
        lines: cart.map((l) => ({
          title: l.title,
          quantity: l.quantity,
          priceRials: l.priceRials,
        })),
        at: new Date().toLocaleString("fa-IR"),
      });
      setCart([]);
    });
  }
function printReceipt() {
  if (!receipt) return;

  const printWindow = window.open("", "_blank", "width=800,height=900");

  if (!printWindow) {
    setError("مرورگر اجازه باز کردن پنجره چاپ را نداد.");
    return;
  }

  const rows = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>${line.title}</td>
          <td>${toPersianDigits(line.quantity)}</td>
          <td>${formatRials(line.priceRials)}</td>
          <td>${formatRials(line.priceRials * line.quantity)}</td>
        </tr>
      `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>فاکتور ${receipt.invoiceNumber}</title>

        <style>
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Tahoma, Arial, sans-serif;
            direction: rtl;
            color: #111827;
            background: white;
          }

          .invoice {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 24px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }

          .header h1 {
            margin: 0;
            font-size: 22px;
          }

          .header p {
            margin: 8px 0 0;
            font-size: 14px;
          }

          .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 24px;
            margin-bottom: 24px;
            font-size: 14px;
          }

          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          th,
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #e5e7eb;
            text-align: right;
          }

          th {
            background: #f3f4f6;
            font-weight: bold;
          }

          .total {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 2px solid #111827;
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: bold;
          }

          .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .invoice {
              border: none;
            }
          }
        </style>
      </head>

      <body>
        <main class="invoice">

          <div class="header">
            <h1>فروشگاه کتاب قلم‌چی نسیم‌شهر</h1>
            <p>فاکتور فروش</p>
          </div>

          <div class="meta">
            <div class="meta-row">
              <span>شماره فاکتور:</span>
              <strong dir="ltr">${receipt.invoiceNumber}</strong>
            </div>

            <div class="meta-row">
              <span>تاریخ:</span>
              <strong>${receipt.at}</strong>
            </div>

            <div class="meta-row">
              <span>خریدار:</span>
              <strong>${receipt.buyerName}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>کتاب</th>
                <th>تعداد</th>
                <th>قیمت واحد</th>
                <th>جمع</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="total">
            <span>مبلغ کل</span>
            <span>${formatRials(receipt.grandTotalRials)}</span>
          </div>

          <div class="footer">
            ستارگان پلاس — فروش کتاب قلم‌چی
          </div>

        </main>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
  if (receipt) {
    return (
      <div className="space-y-4">
        <div className="pos-print-area admin-card mx-auto max-w-md p-6">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">ستارگان پلاس — فروش کتاب</p>
            <p className="mt-1 text-sm text-muted">فاکتور فروش</p>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">شماره فاکتور</span>
              <span dir="ltr" className="font-semibold text-primary">{receipt.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">خریدار</span>
              <span className="text-primary">{receipt.buyerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">تاریخ</span>
              <span className="text-primary">{receipt.at}</span>
            </div>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted">
                <th className="py-2">کتاب</th>
                <th className="py-2">تعداد</th>
                <th className="py-2">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((l, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-primary">{l.title}</td>
                  <td className="py-2">{toPersianDigits(l.quantity)}</td>
                  <td className="py-2">{formatRials(l.priceRials * l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-bold">
            <span className="text-primary">مبلغ کل</span>
            <span className="text-primary">{formatRials(receipt.grandTotalRials)}</span>
          </div>
        </div>
        <div className="pos-no-print mx-auto flex max-w-md gap-3">
          <button
            type="button"
            onClick={printReceipt}
            className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          >
            چاپ فاکتور
          </button>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 flex-1 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-primary"
          >
            فروش جدید
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger lg:col-span-2">
          {error}
        </div>
      ) : null}

      {/* Books */}
      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-primary">کتاب‌ها</h2>
        <input
          value={bookQuery}
          onChange={(e) => runBookSearch(e.target.value)}
          placeholder="جستجو با نام، کد کتاب یا بارکد…"
          className="mt-3 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-primary"
        />
        {bookResults.length > 0 ? (
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {bookResults.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => addBook(book)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-right transition-colors hover:bg-background"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-primary">
                      {book.title}
                    </span>
                    <span className="block text-xs text-muted" dir="ltr">
                      {book.internalCode}
                      {book.barcode ? ` · ${book.barcode}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="block text-sm font-semibold text-primary">
                      {formatRials(book.priceRials)}
                    </span>
                    <span className="block text-xs text-muted">
                      موجودی:{" "}
                      {book.unlimitedStock
                        ? "نامحدود"
                        : toPersianDigits(book.currentStock ?? 0)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            برای افزودن، کتاب را جستجو کنید.
          </p>
        )}

        <h3 className="mt-6 text-sm font-semibold text-primary">سبد فروش</h3>
        {cart.length === 0 ? (
          <p className="mt-2 text-sm text-muted">هنوز کتابی اضافه نشده است.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {cart.map((line) => (
              <li
                key={line.bookSkuId}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {line.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatRials(line.priceRials)}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.bookSkuId, line.quantity - 1)}
                    className="size-9 rounded-lg border border-border bg-surface text-lg font-bold text-primary"
                    aria-label="کاهش"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-primary">
                    {toPersianDigits(line.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.bookSkuId, line.quantity + 1)}
                    className="size-9 rounded-lg border border-border bg-surface text-lg font-bold text-primary"
                    aria-label="افزایش"
                  >
                    +
                  </button>
                </div>
                <span className="w-24 text-left text-sm font-semibold text-primary">
                  {formatRials(line.priceRials * line.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.bookSkuId)}
                  className="text-sm text-danger"
                  aria-label="حذف"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Buyer + checkout */}
      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-primary">خریدار</h2>
        {student ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
            <span className="text-sm font-semibold text-primary">
              {student.fullName}
              {student.gradeLabel ? ` — ${student.gradeLabel}` : ""}
            </span>
            <button
              type="button"
              onClick={() => setStudent(null)}
              className="text-sm text-danger"
            >
              تغییر
            </button>
          </div>
        ) : (
          <>
            <input
              value={studentQuery}
              onChange={(e) => runStudentSearch(e.target.value)}
              placeholder="جستجوی دانش‌آموز (نام یا شناسه قلم‌چی)…"
              className="mt-3 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-primary"
            />
            {studentResults.length > 0 ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {studentResults.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStudent(s);
                        setStudentResults([]);
                        setStudentQuery("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm hover:bg-background"
                    >
                      <span className="text-primary">{s.fullName}</span>
                      <span className="text-xs text-muted">{s.gradeLabel ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-xs text-muted">یا ورود دستی خریدار:</p>
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="نام خریدار"
              className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-primary"
            />
          </>
        )}
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="موبایل (اختیاری)"
          dir="ltr"
          className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-primary"
        />

        <h3 className="mt-5 text-sm font-semibold text-primary">روش پرداخت</h3>
        <div className="mt-2 flex gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMethod(opt.value)}
              className={`min-h-10 flex-1 rounded-xl border px-3 text-sm font-medium transition-colors ${
                paymentMethod === opt.value
                  ? "border-secondary bg-secondary/15 text-primary"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
          <span className="text-sm text-muted">مبلغ کل</span>
          <span className="text-xl font-bold text-primary">{formatRials(total)}</span>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending || cart.length === 0}
          className="mt-4 min-h-12 w-full rounded-xl bg-secondary px-4 text-base font-bold text-primary disabled:opacity-60"
        >
          {pending ? "در حال ثبت…" : "ثبت فروش و صدور فاکتور"}
        </button>
      </section>
    </div>
  );
}
