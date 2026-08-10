"use client";

import { useMemo, useState } from "react";

type FocusCell =
  | "top-left"
  | "top"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

const FOCUS_CELLS: Array<{
  id: FocusCell;
  label: string;
  x: number;
  y: number;
}> = [
  { id: "top-left", label: "بالا راست", x: 75, y: 20 },
  { id: "top", label: "بالا", x: 50, y: 18 },
  { id: "top-right", label: "بالا چپ", x: 25, y: 20 },
  { id: "center-left", label: "وسط راست", x: 78, y: 50 },
  { id: "center", label: "مرکز", x: 50, y: 45 },
  { id: "center-right", label: "وسط چپ", x: 22, y: 50 },
  { id: "bottom-left", label: "پایین راست", x: 75, y: 78 },
  { id: "bottom", label: "پایین", x: 50, y: 82 },
  { id: "bottom-right", label: "پایین چپ", x: 25, y: 78 },
];

type AchievementCinematicAdminPanelProps = {
  title: string;
  shortDescription: string;
  categoryName?: string;
  coverUrl: string | null;
  initialFeatured: boolean;
  onFeaturedChange?: (value: boolean) => void;
};

function objectPositionFor(cell: FocusCell): string {
  const hit = FOCUS_CELLS.find((item) => item.id === cell) ?? FOCUS_CELLS[4];
  return `${hit.x}% ${hit.y}%`;
}

function SlidePreview({
  coverUrl,
  title,
  shortDescription,
  categoryName,
  focus,
  compact = false,
  showFocusOverlay = false,
  onSelectFocus,
}: {
  coverUrl: string | null;
  title: string;
  shortDescription: string;
  categoryName?: string;
  focus: FocusCell;
  compact?: boolean;
  showFocusOverlay?: boolean;
  onSelectFocus?: (cell: FocusCell) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] ${
        compact ? "aspect-[9/16]" : "aspect-[16/10]"
      }`}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: objectPositionFor(focus) }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-[#0f172a] to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/55 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,0.22),transparent_40%)]" />

      {showFocusOverlay && onSelectFocus ? (
        <div className="absolute inset-0 z-20 grid grid-cols-3 grid-rows-3">
          {FOCUS_CELLS.map((cell) => (
            <button
              key={cell.id}
              type="button"
              onClick={() => onSelectFocus(cell.id)}
              aria-label={cell.label}
              className={`border border-white/10 transition ${
                focus === cell.id
                  ? "bg-secondary/25 ring-2 ring-inset ring-secondary"
                  : "bg-transparent hover:bg-white/10"
              }`}
            >
              <span className="sr-only">{cell.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 space-y-2 ${
          compact ? "p-3" : "p-5"
        }`}
      >
        <span className="inline-flex rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-[0.65rem] font-semibold text-secondary">
          {categoryName?.trim() || "ویترین سینمایی"}
        </span>
        <p
          className={`font-bold leading-snug text-white ${
            compact ? "text-sm" : "text-xl"
          }`}
        >
          {title.trim() || "عنوان افتخار"}
        </p>
        <p
          className={`text-white/70 ${
            compact ? "line-clamp-2 text-[0.7rem]" : "line-clamp-2 text-sm"
          }`}
        >
          {shortDescription.trim() || "توضیح کوتاه افتخار در ویترین…"}
        </p>
        <div className={`flex gap-2 ${compact ? "flex-col" : "flex-wrap"}`}>
          <span className="inline-flex items-center justify-center rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
            مشاهده این افتخار
          </span>
          <span className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white">
            همه افتخارات
          </span>
        </div>
      </div>
    </div>
  );
}

export function AchievementCinematicAdminPanel({
  title,
  shortDescription,
  categoryName,
  coverUrl,
  initialFeatured,
  onFeaturedChange,
}: AchievementCinematicAdminPanelProps) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [focus, setFocus] = useState<FocusCell>("center");
  const [slideOrder, setSlideOrder] = useState(1);
  const [tickerText, setTickerText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const missingCoverWarning = featured && !coverUrl;
  const focusLabel = useMemo(
    () => FOCUS_CELLS.find((cell) => cell.id === focus)?.label ?? "مرکز",
    [focus],
  );

  return (
    <section className="achievement-cinematic-admin overflow-hidden rounded-3xl border border-secondary/25 bg-[linear-gradient(160deg,#0b1220_0%,#0f172a_55%,#152238_100%)] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-secondary">
            STAROS SHOWCASE
          </p>
          <h2 className="mt-1 text-lg font-bold sm:text-xl">
            ویترین سینمایی صفحه افتخارات
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            کنترل نمایش این افتخار در ویترین سینمایی — پیش‌نمایش زنده؛ فوکوس، ترتیب
            اسلاید و تیکر فقط محلی هستند و در این فاز ذخیره نمی‌شوند.
          </p>
        </div>
        <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs text-secondary">
          Admin Preview
        </span>
      </div>

      <label className="mb-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
        <span>
          <span className="block text-sm font-semibold">
            نمایش در ویترین سینمایی
          </span>
          <span className="mt-0.5 block text-xs text-white/55">
            از وضعیت ویژه (Featured) موجود استفاده می‌کند
          </span>
        </span>
        <span className="relative inline-flex h-8 w-14 shrink-0 items-center">
          <input
            type="checkbox"
            name="isFeatured"
            value="true"
            checked={featured}
            onChange={(event) => {
              const next = event.target.checked;
              setFeatured(next);
              onFeaturedChange?.(next);
            }}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-white/15 transition peer-checked:bg-secondary/80 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary" />
          <span className="absolute start-1 size-6 rounded-full bg-white transition peer-checked:translate-x-6 rtl:peer-checked:-translate-x-6" />
        </span>
      </label>

      {missingCoverWarning ? (
        <div className="mb-5 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          ویترین سینمایی فعال است اما کاور بارگذاری نشده. برای نمایش صحیح، ابتدا
          تصویر کاور را آپلود کنید.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-secondary">
              پیش‌نمایش دسکتاپ
            </h3>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] text-white/70">
              16:10 · فوکوس روی تصویر
            </span>
          </div>
          <SlidePreview
            coverUrl={coverUrl}
            title={title}
            shortDescription={shortDescription}
            categoryName={categoryName}
            focus={focus}
            showFocusOverlay
            onSelectFocus={setFocus}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-secondary">
              پیش‌نمایش موبایل
            </h3>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] text-white/70">
              Phone
            </span>
          </div>
          <div className="mx-auto w-[min(100%,17rem)] rounded-[1.75rem] border border-white/15 bg-black/40 p-2 shadow-inner">
            <div className="mb-2 flex justify-center">
              <span className="h-1.5 w-16 rounded-full bg-white/25" />
            </div>
            <SlidePreview
              coverUrl={coverUrl}
              title={title}
              shortDescription={shortDescription}
              categoryName={categoryName}
              focus={focus}
              compact
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-secondary">
            نقطه تمرکز تصویر
          </h3>
          <p className="mt-1 text-xs text-white/55">
            روی پیش‌نمایش دسکتاپ کلیک کنید یا از شبکه زیر انتخاب کنید — فقط محلی.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {FOCUS_CELLS.map((cell) => (
              <button
                key={cell.id}
                type="button"
                onClick={() => setFocus(cell.id)}
                className={`rounded-xl border px-2 py-3 text-xs transition ${
                  focus === cell.id
                    ? "border-secondary bg-secondary/20 text-secondary"
                    : "border-white/10 bg-black/20 text-white/75 hover:border-white/25"
                }`}
              >
                {cell.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">انتخاب فعلی: {focusLabel}</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <h3 className="text-sm font-semibold text-secondary">ترتیب اسلاید</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-secondary/35 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary">
                اسلاید شماره {slideOrder}
              </span>
              <input
                type="number"
                min={1}
                max={99}
                value={slideOrder}
                onChange={(event) =>
                  setSlideOrder(Math.max(1, Number(event.target.value) || 1))
                }
                className="w-24 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                dir="ltr"
              />
            </div>
            <p className="mt-2 text-xs text-white/50">
              مقدار موقت برای طراحی UI — ذخیره بک‌اند در این فاز نیست.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-secondary">
              متن تیکر (اختیاری)
            </span>
            <textarea
              rows={3}
              value={tickerText}
              onChange={(event) => setTickerText(event.target.value)}
              placeholder="متن موقت برای نوار تیکر ویترین…"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-secondary/40 bg-secondary px-5 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(212,175,55,0.25)] transition hover:bg-secondary/90"
        >
          پیش‌نمایش اسلاید سینمایی
        </button>
        {tickerText.trim() ? (
          <span className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70">
            تیکر: {tickerText.trim()}
          </span>
        ) : null}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="پیش‌نمایش ویترین سینمایی"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-secondary">
                پیش‌نمایش دقیق اسلاید
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                بستن
              </button>
            </div>
            <div className="p-4">
              <SlidePreview
                coverUrl={coverUrl}
                title={title}
                shortDescription={shortDescription}
                categoryName={categoryName}
                focus={focus}
              />
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full border border-white/10 px-2.5 py-1">
                  اسلاید شماره {slideOrder}
                </span>
                <span className="rounded-full border border-white/10 px-2.5 py-1">
                  فوکوس: {focusLabel}
                </span>
                <span className="rounded-full border border-white/10 px-2.5 py-1">
                  {featured ? "ویترین فعال" : "ویترین خاموش"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
