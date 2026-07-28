import type { CapacityBlockConfig } from "@/lib/experience/blocks/capacity";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { toPersianDigits } from "@/lib/persian";

export function CapacityBlockPublic({
  config,
  binding,
}: ExperiencePublicBlockRendererProps<CapacityBlockConfig>) {
  if (!binding) return null;
  const { flow, registrationCount } = binding;
  if (flow.capacity == null || flow.capacity <= 0) {
    return null;
  }

  const isFull = flow.closedReason === "full";
  const remaining = Math.max(0, flow.capacity - registrationCount);

  if (isFull && config.fullMessage) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {config.fullMessage}
      </section>
    );
  }

  if (config.showRemaining === false) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-surface px-6 py-4 text-sm text-foreground">
      {config.heading ? (
        <p className="mb-2 font-semibold text-primary">{config.heading}</p>
      ) : null}
      <p>
        ظرفیت باقی‌مانده:{" "}
        <span className="font-bold text-primary">
          {toPersianDigits(String(remaining))}
        </span>
        {" / "}
        {toPersianDigits(String(flow.capacity))}
      </p>
    </section>
  );
}
