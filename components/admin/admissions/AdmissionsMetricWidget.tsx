import type { WidgetPayload } from "@/lib/dashboard/contracts/widget";
import { AdmissionsWidgetFrame } from "@/components/admin/admissions/AdmissionsWidgetFrame";
import { toPersianDigits } from "@/lib/persian";

function readMetric(data: unknown): {
  primary: string;
  hint?: string;
} {
  if (!data || typeof data !== "object") {
    return { primary: "—" };
  }
  const row = data as Record<string, unknown>;
  if (typeof row.value === "number") {
    return {
      primary: toPersianDigits(row.value),
      hint: row.period === "today" ? "امروز" : undefined,
    };
  }
  if (typeof row.ratePercent === "number") {
    return {
      primary: `${toPersianDigits(row.ratePercent)}٪`,
      hint:
        typeof row.attributedConversions === "number" &&
        typeof row.leadsCreated === "number"
          ? `${toPersianDigits(row.attributedConversions)} از ${toPersianDigits(row.leadsCreated)}`
          : undefined,
    };
  }
  if (typeof row.valueRials === "number") {
    return {
      primary: toPersianDigits(row.valueRials),
      hint: "ریال",
    };
  }
  return { primary: "—" };
}

export function AdmissionsMetricWidget({
  widget,
  riseClassName,
}: {
  widget: WidgetPayload;
  riseClassName?: string;
}) {
  const metric = readMetric(widget.data);

  return (
    <AdmissionsWidgetFrame widget={widget} riseClassName={riseClassName}>
      <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {metric.primary}
      </p>
      {metric.hint ? (
        <p className="mt-2 text-xs text-muted">{metric.hint}</p>
      ) : null}
    </AdmissionsWidgetFrame>
  );
}
