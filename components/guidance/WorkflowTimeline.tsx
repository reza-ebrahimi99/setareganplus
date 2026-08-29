/**
 * Guidance ERP — portal workflow timeline presentation.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";

const STATE_LABEL: Record<GuidanceTimelineStep["state"], string> = {
  complete: "انجام شد",
  active: "اقدام لازم",
  pending_review: "در انتظار بررسی",
  locked: "به‌زودی",
};

type GuidanceWorkflowTimelineProps = {
  steps: readonly GuidanceTimelineStep[];
};

export function GuidanceWorkflowTimeline({
  steps,
}: GuidanceWorkflowTimelineProps) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const marker =
          step.state === "complete"
            ? "✓"
            : step.state === "pending_review"
              ? "…"
              : "○";

        const body = (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-primary"
              >
                {marker}
              </span>
              <div>
                <p className="font-medium text-primary">{step.label}</p>
                <p className="mt-1 text-xs text-muted">{STATE_LABEL[step.state]}</p>
              </div>
            </div>
          </div>
        );

        if (step.href && (step.state === "active" || step.state === "pending_review")) {
          return (
            <li
              key={step.key}
              className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4"
            >
              <a
                href={step.href}
                className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {body}
                <p className="mt-3 text-sm font-medium text-primary">
                  {step.state === "pending_review"
                    ? "مشاهده / جایگزینی کارنامه"
                    : "بارگذاری کارنامه"}
                </p>
              </a>
            </li>
          );
        }

        return (
          <li
            key={step.key}
            className={`rounded-2xl border border-border bg-surface p-4 ${
              step.state === "locked" ? "opacity-70" : ""
            }`}
          >
            {body}
          </li>
        );
      })}
    </ol>
  );
}
