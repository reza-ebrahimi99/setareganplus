import type { ComposedDashboard } from "@/lib/dashboard/compose";
import type { WidgetPayload } from "@/lib/dashboard/contracts/widget";
import { AdmissionsGlassCard } from "@/components/admin/admissions/AdmissionsGlassCard";
import { AdmissionsMetricWidget } from "@/components/admin/admissions/AdmissionsMetricWidget";
import { AdmissionsPipelineWidget } from "@/components/admin/admissions/AdmissionsPipelineWidget";
import { AdmissionsQueueWidget } from "@/components/admin/admissions/AdmissionsQueueWidget";
import { AdmissionsWidgetFrame } from "@/components/admin/admissions/AdmissionsWidgetFrame";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { AdminBreadcrumbItem } from "@/content/admin";

const METRIC_IDS = new Set(["leads_today", "conversion", "revenue"]);
const QUEUE_IDS = new Set([
  "queue_assignment",
  "queue_follow_up",
  "queue_sla_breaches",
]);

function pick(widgets: WidgetPayload[], id: string): WidgetPayload | undefined {
  return widgets.find((w) => w.id === id);
}

function renderWidget(
  widget: WidgetPayload,
  riseClassName?: string,
) {
  if (METRIC_IDS.has(widget.id)) {
    return (
      <AdmissionsMetricWidget
        key={widget.id}
        widget={widget}
        riseClassName={riseClassName}
      />
    );
  }
  if (widget.id === "pipeline") {
    return (
      <AdmissionsPipelineWidget
        key={widget.id}
        widget={widget}
        riseClassName={riseClassName}
      />
    );
  }
  if (QUEUE_IDS.has(widget.id)) {
    return (
      <AdmissionsQueueWidget
        key={widget.id}
        widget={widget}
        riseClassName={riseClassName}
      />
    );
  }
  return (
    <AdmissionsWidgetFrame
      key={widget.id}
      widget={widget}
      riseClassName={riseClassName}
    >
      <p className="text-sm text-muted">نمایش اختصاصی برای این ویجت تعریف نشده است.</p>
    </AdmissionsWidgetFrame>
  );
}

export function AdmissionsWorkspace({
  dashboard,
  breadcrumbs,
}: {
  dashboard: ComposedDashboard;
  breadcrumbs: readonly AdminBreadcrumbItem[];
}) {
  const { widgets } = dashboard;
  const leadsToday = pick(widgets, "leads_today");
  const pipeline = pick(widgets, "pipeline");
  const assignment = pick(widgets, "queue_assignment");
  const followUp = pick(widgets, "queue_follow_up");
  const sla = pick(widgets, "queue_sla_breaches");

  const metricRow = [leadsToday].filter(Boolean) as WidgetPayload[];
  const queueColumn = [assignment, followUp, sla].filter(
    Boolean,
  ) as WidgetPayload[];

  const knownIds = new Set(
    [
      leadsToday?.id,
      pipeline?.id,
      assignment?.id,
      followUp?.id,
      sla?.id,
    ].filter(Boolean),
  );
  const extras = widgets.filter((w) => !knownIds.has(w.id));

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-2 h-48 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgb(212_175_55_/_0.08),transparent_55%),radial-gradient(ellipse_50%_40%_at_0%_20%,rgb(15_23_42_/_0.04),transparent_50%)]"
      />

      <div className="relative admissions-rise">
        <AdminPageHeader
          title={dashboard.title}
          description={
            dashboard.description ??
            "نمای عملیاتی پذیرش از داشبورد، صف‌ها و شاخص‌ها"
          }
          breadcrumbs={[...breadcrumbs]}
          compact
        />
      </div>

      {widgets.length === 0 ? (
        <AdmissionsGlassCard className="admissions-rise admissions-rise-delay-1 px-5 py-12 text-center">
          <p className="font-semibold text-primary">ویجتی برای نمایش نیست</p>
          <p className="mt-2 text-sm text-muted">
            یا مجوز ویجت‌ها کافی نیست یا داشبورد خالی است.
          </p>
        </AdmissionsGlassCard>
      ) : (
        <div className="relative space-y-4 sm:space-y-5">
          {/* Mobile-first metrics strip */}
          {metricRow.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metricRow.map((widget, index) =>
                renderWidget(
                  widget,
                  `admissions-rise admissions-rise-delay-${Math.min(index + 1, 3)}`,
                ),
              )}
            </div>
          ) : null}

          {/*
            Mobile: pipeline then queues stacked
            Desktop: pipeline | queues (5 / 7)
          */}
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="order-1 lg:order-none lg:col-span-5">
              {pipeline
                ? renderWidget(
                    pipeline,
                    "admissions-rise admissions-rise-delay-2",
                  )
                : null}
            </div>
            <div className="order-2 flex flex-col gap-4 lg:col-span-7">
              {queueColumn.map((widget, index) =>
                renderWidget(
                  widget,
                  `admissions-rise admissions-rise-delay-${Math.min(index + 1, 3)}`,
                ),
              )}
            </div>
          </div>

          {extras.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {extras.map((widget) => renderWidget(widget, "admissions-rise"))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AdmissionsWorkspaceForbidden() {
  return (
    <>
      <AdminPageHeader
        title="میز کار پذیرش"
        description="نمای عملیاتی پذیرش"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "میز کار پذیرش" },
        ]}
        compact
      />
      <AdmissionsGlassCard
        className="border-amber-200/80 px-5 py-10 text-center"
        aria-label="دسترسی محدود"
      >
        <p className="font-semibold text-primary">دسترسی به این داشبورد ندارید</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          برای مشاهده میز کار پذیرش به مجوز گزارش و ثبت‌نام نیاز است.
        </p>
      </AdmissionsGlassCard>
    </>
  );
}

export function AdmissionsWorkspaceError({ message }: { message?: string }) {
  return (
    <>
      <AdminPageHeader
        title="میز کار پذیرش"
        description="نمای عملیاتی پذیرش"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "میز کار پذیرش" },
        ]}
        compact
      />
      <AdmissionsGlassCard
        className="border-red-200/80 px-5 py-10 text-center"
        aria-label="خطای بارگذاری"
      >
        <div role="alert">
          <p className="font-semibold text-danger">بارگذاری میز کار ممکن نشد</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            {message ?? "لطفاً چند لحظه دیگر دوباره تلاش کنید."}
          </p>
        </div>
      </AdmissionsGlassCard>
    </>
  );
}
