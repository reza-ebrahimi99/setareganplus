"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";

type AchievementFocusPickerProps = {
  label: string;
  imageUrl: string | null;
  xName: string;
  yName: string;
  defaultX: number;
  defaultY: number;
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function AchievementFocusPicker({
  label,
  imageUrl,
  xName,
  yName,
  defaultX,
  defaultY,
}: AchievementFocusPickerProps) {
  const [x, setX] = useState(clamp(defaultX));
  const [y, setY] = useState(clamp(defaultY));

  const onPick = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nextX = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const nextY = clamp(((event.clientY - rect.top) / rect.height) * 100);
    setX(Math.round(nextX * 10) / 10);
    setY(Math.round(nextY * 10) / 10);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-primary">{label}</p>
      <p className="text-xs text-muted">
        روی تصویر کلیک کنید تا نقطه تمرکز ذخیره شود.
      </p>
      <input type="hidden" name={xName} value={String(x)} />
      <input type="hidden" name={yName} value={String(y)} />
      <button
        type="button"
        onClick={onPick}
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-slate-100"
        aria-label={`${label}: انتخاب نقطه تمرکز`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: `${x}% ${y}%` }}
            draggable={false}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-muted">
            ابتدا کاور را بارگذاری کنید
          </span>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-secondary/90 shadow"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/35"
          style={{ top: `${y}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/35"
          style={{ left: `${x}%` }}
        />
      </button>
      <p className="text-xs text-muted" dir="ltr">
        X {x}% · Y {y}%
      </p>
    </div>
  );
}
