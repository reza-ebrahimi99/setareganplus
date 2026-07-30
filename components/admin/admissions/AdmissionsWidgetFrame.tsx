import type { WidgetPayload } from "@/lib/dashboard/contracts/widget";
import { AdmissionsGlassCard } from "@/components/admin/admissions/AdmissionsGlassCard";

type AdmissionsWidgetFrameProps = {
  widget: WidgetPayload;
  children: React.ReactNode;
  className?: string;
  riseClassName?: string;
};

function statusMessage(widget: WidgetPayload): {
  tone: "muted" | "danger" | "warn";
  title: string;
  description?: string;
} | null {
  if (widget.status === "empty") {
    return {
      tone: "muted",
      title: widget.emptyState.title,
      description: widget.emptyState.description,
    };
  }
  if (widget.status === "error") {
    const err =
      widget.data &&
      typeof widget.data === "object" &&
      "error" in widget.data &&
      typeof (widget.data as { error?: unknown }).error === "string"
        ? (widget.data as { error: string }).error
        : undefined;
    return {
      tone: "danger",
      title: "بارگذاری این بخش ممکن نشد",
      description: err,
    };
  }
  if (widget.status === "forbidden") {
    return {
      tone: "warn",
      title: "دسترسی ندارید",
      description: "مجوز مشاهده این ویجت برای حساب شما فعال نیست.",
    };
  }
  return null;
}

export function AdmissionsWidgetFrame({
  widget,
  children,
  className = "",
  riseClassName = "",
}: AdmissionsWidgetFrameProps) {
  const message = statusMessage(widget);
  const headingId = `admissions-widget-${widget.id}`;

  return (
    <AdmissionsGlassCard
      className={`p-4 sm:p-5 ${riseClassName} ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2
          id={headingId}
          className="text-sm font-semibold text-primary sm:text-base"
        >
          {widget.title}
        </h2>
        <span
          className="shrink-0 rounded-md border border-border/80 bg-background/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted"
          dir="ltr"
        >
          {widget.dataSource}
        </span>
      </div>

      {message ? (
        <div
          role={message.tone === "danger" ? "alert" : undefined}
          className={
            message.tone === "danger"
              ? "rounded-lg border border-red-200 bg-red-50/80 px-3 py-4 text-sm text-red-800"
              : message.tone === "warn"
                ? "rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-4 text-sm text-amber-900"
                : "rounded-lg border border-dashed border-border bg-background/50 px-3 py-8 text-center"
          }
        >
          <p
            className={
              message.tone === "muted"
                ? "font-medium text-primary"
                : "font-medium"
            }
          >
            {message.title}
          </p>
          {message.description ? (
            <p
              className={
                message.tone === "muted"
                  ? "mt-1 text-xs leading-6 text-muted"
                  : "mt-1 text-xs leading-6 opacity-90"
              }
            >
              {message.description}
            </p>
          ) : null}
        </div>
      ) : (
        children
      )}
    </AdmissionsGlassCard>
  );
}
