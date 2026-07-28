import type { CapacityBlockConfig } from "@/lib/experience/blocks/capacity";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { toPersianDigits } from "@/lib/persian";

export function CapacityBlockPublic({
  config,
  context,
}: ExperiencePublicBlockRendererProps<CapacityBlockConfig>) {
  const { capacity } = context;

  if (capacity.isUnavailable) {
    return null;
  }

  if (capacity.isUnlimited) {
    if (config.heading) {
      return (
        <section className="rounded-2xl border border-border bg-surface px-6 py-4 text-sm text-foreground">
          <p className="font-semibold text-primary">{config.heading}</p>
          <p className="mt-2 text-muted">ظرفیت محدود اعلام نشده است.</p>
        </section>
      );
    }
    return null;
  }

  if (capacity.isFull && config.fullMessage) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {config.fullMessage}
      </section>
    );
  }

  if (config.showRemaining === false) {
    return null;
  }

  const limit = capacity.limit ?? 0;
  const remaining = capacity.remaining ?? 0;

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
        {toPersianDigits(String(limit))}
      </p>
    </section>
  );
}
