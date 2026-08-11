"use client";

import { useMemo, useState, type CSSProperties } from "react";

export type CinematicFramingValues = {
  desktopFocusX: number;
  desktopFocusY: number;
  tabletFocusX: number;
  tabletFocusY: number;
  mobileFocusX: number;
  mobileFocusY: number;
  desktopZoom: number;
  tabletZoom: number;
  mobileZoom: number;
};

type Breakpoint = "desktop" | "tablet" | "mobile";

type AchievementCinematicAdminPanelProps = {
  title: string;
  shortDescription: string;
  categoryName?: string;
  coverUrl: string | null;
  initialFeatured: boolean;
  initialFraming?: Partial<CinematicFramingValues>;
  onFeaturedChange?: (value: boolean) => void;
};

const DEFAULT_FRAMING: CinematicFramingValues = {
  desktopFocusX: 50,
  desktopFocusY: 42,
  tabletFocusX: 50,
  tabletFocusY: 40,
  mobileFocusX: 50,
  mobileFocusY: 35,
  desktopZoom: 1,
  tabletZoom: 1,
  mobileZoom: 1,
};

function clampFocus(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function clampZoom(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1.5, Math.max(0.5, Math.round(value * 100) / 100));
}

function mergeFraming(
  initial?: Partial<CinematicFramingValues>,
): CinematicFramingValues {
  return {
    desktopFocusX: clampFocus(
      initial?.desktopFocusX ?? DEFAULT_FRAMING.desktopFocusX,
      DEFAULT_FRAMING.desktopFocusX,
    ),
    desktopFocusY: clampFocus(
      initial?.desktopFocusY ?? DEFAULT_FRAMING.desktopFocusY,
      DEFAULT_FRAMING.desktopFocusY,
    ),
    tabletFocusX: clampFocus(
      initial?.tabletFocusX ?? DEFAULT_FRAMING.tabletFocusX,
      DEFAULT_FRAMING.tabletFocusX,
    ),
    tabletFocusY: clampFocus(
      initial?.tabletFocusY ?? DEFAULT_FRAMING.tabletFocusY,
      DEFAULT_FRAMING.tabletFocusY,
    ),
    mobileFocusX: clampFocus(
      initial?.mobileFocusX ?? DEFAULT_FRAMING.mobileFocusX,
      DEFAULT_FRAMING.mobileFocusX,
    ),
    mobileFocusY: clampFocus(
      initial?.mobileFocusY ?? DEFAULT_FRAMING.mobileFocusY,
      DEFAULT_FRAMING.mobileFocusY,
    ),
    desktopZoom: clampZoom(
      initial?.desktopZoom ?? DEFAULT_FRAMING.desktopZoom,
      DEFAULT_FRAMING.desktopZoom,
    ),
    tabletZoom: clampZoom(
      initial?.tabletZoom ?? DEFAULT_FRAMING.tabletZoom,
      DEFAULT_FRAMING.tabletZoom,
    ),
    mobileZoom: clampZoom(
      initial?.mobileZoom ?? DEFAULT_FRAMING.mobileZoom,
      DEFAULT_FRAMING.mobileZoom,
    ),
  };
}

function framingFor(
  framing: CinematicFramingValues,
  breakpoint: Breakpoint,
): { x: number; y: number; zoom: number } {
  if (breakpoint === "desktop") {
    return {
      x: framing.desktopFocusX,
      y: framing.desktopFocusY,
      zoom: framing.desktopZoom,
    };
  }
  if (breakpoint === "tablet") {
    return {
      x: framing.tabletFocusX,
      y: framing.tabletFocusY,
      zoom: framing.tabletZoom,
    };
  }
  return {
    x: framing.mobileFocusX,
    y: framing.mobileFocusY,
    zoom: framing.mobileZoom,
  };
}

function SlidePreview({
  coverUrl,
  title,
  shortDescription,
  categoryName,
  focusX,
  focusY,
  zoom,
  compact = false,
  onPickFocus,
}: {
  coverUrl: string | null;
  title: string;
  shortDescription: string;
  categoryName?: string;
  focusX: number;
  focusY: number;
  zoom: number;
  compact?: boolean;
  onPickFocus?: (x: number, y: number) => void;
}) {
  const imageStyle = {
    objectFit: "cover",
    objectPosition: `${focusX}% ${focusY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: "center center",
  } satisfies CSSProperties;

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
          className="absolute inset-0 h-full w-full"
          style={imageStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-[#0f172a] to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/55 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,175,55,0.22),transparent_40%)]" />

      {onPickFocus ? (
        <button
          type="button"
          aria-label="تنظیم نقطه تمرکز با کلیک روی تصویر"
          className="absolute inset-0 z-20 cursor-crosshair bg-transparent"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            onPickFocus(clampFocus(x, 50), clampFocus(y, 50));
          }}
        />
      ) : null}

      <div
        className="pointer-events-none absolute z-30 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-secondary bg-secondary/40 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{ left: `${focusX}%`, top: `${focusY}%` }}
        aria-hidden="true"
      />

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
      </div>
    </div>
  );
}

function FramingControls({
  label,
  focusX,
  focusY,
  zoom,
  onChange,
}: {
  label: string;
  focusX: number;
  focusY: number;
  zoom: number;
  onChange: (next: { x: number; y: number; zoom: number }) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-secondary">{label}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-white/70">
          <span className="mb-1 block">X (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={focusX}
            onChange={(event) =>
              onChange({
                x: clampFocus(Number(event.target.value), focusX),
                y: focusY,
                zoom,
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            dir="ltr"
          />
        </label>
        <label className="block text-xs text-white/70">
          <span className="mb-1 block">Y (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={focusY}
            onChange={(event) =>
              onChange({
                x: focusX,
                y: clampFocus(Number(event.target.value), focusY),
                zoom,
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            dir="ltr"
          />
        </label>
        <label className="block text-xs text-white/70">
          <span className="mb-1 block">Zoom</span>
          <input
            type="number"
            min={0.5}
            max={1.5}
            step={0.01}
            value={zoom}
            onChange={(event) =>
              onChange({
                x: focusX,
                y: focusY,
                zoom: clampZoom(Number(event.target.value), zoom),
              })
            }
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            dir="ltr"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-white/70">
        <span className="mb-1 flex items-center justify-between gap-2">
          <span>بزرگ‌نمایی</span>
          <span className="font-mono text-secondary" dir="ltr">
            {zoom.toFixed(2)}
          </span>
        </span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.01}
          value={zoom}
          onChange={(event) =>
            onChange({
              x: focusX,
              y: focusY,
              zoom: clampZoom(Number(event.target.value), zoom),
            })
          }
          className="w-full accent-[#d4af37]"
        />
        <span className="mt-1 block text-[0.7rem] text-white/45">
          زیرتر از ۱ = زوم‌اوت (نمایش بیشتر پوستر روی موبایل)
        </span>
      </label>
    </div>
  );
}

export function AchievementCinematicAdminPanel({
  title,
  shortDescription,
  categoryName,
  coverUrl,
  initialFeatured,
  initialFraming,
  onFeaturedChange,
}: AchievementCinematicAdminPanelProps) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [framing, setFraming] = useState(() => mergeFraming(initialFraming));
  const [activeBreakpoint, setActiveBreakpoint] =
    useState<Breakpoint>("desktop");
  const [modalOpen, setModalOpen] = useState(false);

  const missingCoverWarning = featured && !coverUrl;
  const desktop = useMemo(
    () => framingFor(framing, "desktop"),
    [framing],
  );
  const tablet = useMemo(() => framingFor(framing, "tablet"), [framing]);
  const mobile = useMemo(() => framingFor(framing, "mobile"), [framing]);
  const active = framingFor(framing, activeBreakpoint);

  const updateBreakpoint = (
    breakpoint: Breakpoint,
    next: { x: number; y: number; zoom: number },
  ) => {
    setFraming((current) => {
      if (breakpoint === "desktop") {
        return {
          ...current,
          desktopFocusX: next.x,
          desktopFocusY: next.y,
          desktopZoom: next.zoom,
        };
      }
      if (breakpoint === "tablet") {
        return {
          ...current,
          tabletFocusX: next.x,
          tabletFocusY: next.y,
          tabletZoom: next.zoom,
        };
      }
      return {
        ...current,
        mobileFocusX: next.x,
        mobileFocusY: next.y,
        mobileZoom: next.zoom,
      };
    });
  };

  return (
    <section className="achievement-cinematic-admin overflow-hidden rounded-3xl border border-secondary/25 bg-[linear-gradient(160deg,#0b1220_0%,#0f172a_55%,#152238_100%)] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
      {/* Persist per-achievement framing with the parent form */}
      <input type="hidden" name="desktopFocusX" value={String(framing.desktopFocusX)} />
      <input type="hidden" name="desktopFocusY" value={String(framing.desktopFocusY)} />
      <input type="hidden" name="tabletFocusX" value={String(framing.tabletFocusX)} />
      <input type="hidden" name="tabletFocusY" value={String(framing.tabletFocusY)} />
      <input type="hidden" name="mobileFocusX" value={String(framing.mobileFocusX)} />
      <input type="hidden" name="mobileFocusY" value={String(framing.mobileFocusY)} />
      <input type="hidden" name="desktopZoom" value={String(framing.desktopZoom)} />
      <input type="hidden" name="tabletZoom" value={String(framing.tabletZoom)} />
      <input type="hidden" name="mobileZoom" value={String(framing.mobileZoom)} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-secondary">
            STAROS SHOWCASE
          </p>
          <h2 className="mt-1 text-lg font-bold sm:text-xl">
            فریمینگ سینمایی هر اسلاید
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            موقعیت و زوم جداگانه برای دسکتاپ، تبلت و موبایل — پیش‌نمایش زنده و ذخیره
            روی همین افتخار.
          </p>
        </div>
        <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs text-secondary">
          Live Framing
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["desktop", "دسکتاپ"],
            ["tablet", "تبلت"],
            ["mobile", "موبایل"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveBreakpoint(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              activeBreakpoint === id
                ? "border-secondary bg-secondary/20 text-secondary"
                : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
            }`}
          >
            ویرایش {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-secondary">
              پیش‌نمایش دسکتاپ
            </h3>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] text-white/70" dir="ltr">
              {desktop.x}% · {desktop.y}% · z{desktop.zoom.toFixed(2)}
            </span>
          </div>
          <SlidePreview
            coverUrl={coverUrl}
            title={title}
            shortDescription={shortDescription}
            categoryName={categoryName}
            focusX={desktop.x}
            focusY={desktop.y}
            zoom={desktop.zoom}
            onPickFocus={
              activeBreakpoint === "desktop"
                ? (x, y) =>
                    updateBreakpoint("desktop", {
                      x,
                      y,
                      zoom: framing.desktopZoom,
                    })
                : undefined
            }
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-secondary">
              پیش‌نمایش موبایل
            </h3>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] text-white/70" dir="ltr">
              {mobile.x}% · {mobile.y}% · z{mobile.zoom.toFixed(2)}
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
              focusX={mobile.x}
              focusY={mobile.y}
              zoom={mobile.zoom}
              compact
              onPickFocus={
                activeBreakpoint === "mobile"
                  ? (x, y) =>
                      updateBreakpoint("mobile", {
                        x,
                        y,
                        zoom: framing.mobileZoom,
                      })
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-secondary">
            پیش‌نمایش تبلت
          </h3>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.7rem] text-white/70" dir="ltr">
            {tablet.x}% · {tablet.y}% · z{tablet.zoom.toFixed(2)}
          </span>
        </div>
        <div className="mx-auto w-full max-w-xl">
          <SlidePreview
            coverUrl={coverUrl}
            title={title}
            shortDescription={shortDescription}
            categoryName={categoryName}
            focusX={tablet.x}
            focusY={tablet.y}
            zoom={tablet.zoom}
            onPickFocus={
              activeBreakpoint === "tablet"
                ? (x, y) =>
                    updateBreakpoint("tablet", {
                      x,
                      y,
                      zoom: framing.tabletZoom,
                    })
                : undefined
            }
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <FramingControls
          label="فریمینگ دسکتاپ"
          focusX={desktop.x}
          focusY={desktop.y}
          zoom={desktop.zoom}
          onChange={(next) => updateBreakpoint("desktop", next)}
        />
        <FramingControls
          label="فریمینگ تبلت"
          focusX={tablet.x}
          focusY={tablet.y}
          zoom={tablet.zoom}
          onChange={(next) => updateBreakpoint("tablet", next)}
        />
        <FramingControls
          label="فریمینگ موبایل"
          focusX={mobile.x}
          focusY={mobile.y}
          zoom={mobile.zoom}
          onChange={(next) => updateBreakpoint("mobile", next)}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-secondary/40 bg-secondary px-5 text-sm font-semibold text-primary shadow-[0_10px_30px_rgba(212,175,55,0.25)] transition hover:bg-secondary/90"
        >
          پیش‌نمایش اسلاید سینمایی
        </button>
        <span className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70" dir="ltr">
          active: {activeBreakpoint} · {active.x}% {active.y}% · z
          {active.zoom.toFixed(2)}
        </span>
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
            <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_0.8fr]">
              <SlidePreview
                coverUrl={coverUrl}
                title={title}
                shortDescription={shortDescription}
                categoryName={categoryName}
                focusX={desktop.x}
                focusY={desktop.y}
                zoom={desktop.zoom}
              />
              <div className="mx-auto w-[min(100%,14rem)]">
                <SlidePreview
                  coverUrl={coverUrl}
                  title={title}
                  shortDescription={shortDescription}
                  categoryName={categoryName}
                  focusX={mobile.x}
                  focusY={mobile.y}
                  zoom={mobile.zoom}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
