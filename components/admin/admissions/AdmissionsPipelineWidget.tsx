import type { WidgetPayload } from "@/lib/dashboard/contracts/widget";
import { AdmissionsWidgetFrame } from "@/components/admin/admissions/AdmissionsWidgetFrame";
import { toPersianDigits } from "@/lib/persian";

type SeriesPoint = {
  value: number;
  dimensions?: Record<string, string | null>;
};

function readPoints(raw: unknown): SeriesPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is SeriesPoint =>
      !!p &&
      typeof p === "object" &&
      typeof (p as SeriesPoint).value === "number",
  );
}

function pointLabel(point: SeriesPoint): string {
  const owner =
    point.dimensions?.ownerUserId ??
    point.dimensions?.attributedUserId ??
    null;
  if (!owner || owner === "none") return "بدون مالک";
  return owner.slice(0, 12);
}

function topPoints(points: SeriesPoint[], limit = 6): SeriesPoint[] {
  return [...points]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function AdmissionsPipelineWidget({
  widget,
  riseClassName,
}: {
  widget: WidgetPayload;
  riseClassName?: string;
}) {
  const data =
    widget.data && typeof widget.data === "object"
      ? (widget.data as Record<string, unknown>)
      : {};
  const owned = topPoints(readPoints(data.ownedByOwner));
  const maxOwned = Math.max(1, ...owned.map((p) => p.value));

  return (
    <AdmissionsWidgetFrame widget={widget} riseClassName={riseClassName}>
      {owned.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          تفکیک مالکیت برای نمایش موجود نیست.
        </p>
      ) : (
        <ul className="space-y-3">
          {owned.map((point, index) => {
            const width = Math.round((point.value / maxOwned) * 100);
            const key =
              point.dimensions?.ownerUserId ??
              point.dimensions?.attributedUserId ??
              `row-${index}`;
            return (
              <li key={`${key}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted" dir="ltr">
                    {pointLabel(point)}
                  </span>
                  <span className="font-medium text-primary">
                    {toPersianDigits(point.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-secondary/80 transition-[width] duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdmissionsWidgetFrame>
  );
}
