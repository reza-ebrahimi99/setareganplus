import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { WorkspaceStepRailItem } from "@/lib/guidance/workspace";

export function WorkspaceJourneyRail({
  steps,
  activeStepId,
}: {
  steps: readonly WorkspaceStepRailItem[];
  activeStepId?: number;
}) {
  return (
    <ol className="counselor-workspace__rail" aria-label="۱۲ مرحله هدایت تحصیلی">
      {steps.map((step) => {
        const isCurrent = activeStepId === step.id;
        return (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`counselor-workspace__rail-step${isCurrent ? " is-current" : ""}`}
              data-status={step.status}
            >
              <span className="counselor-workspace__rail-index">
                {toPersianDigits(step.id)}
              </span>
              <span className="counselor-workspace__rail-copy">
                <strong>{step.shortTitle}</strong>
                <em>
                  {step.statusLabel} · {step.reviewStatusLabel}
                </em>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
