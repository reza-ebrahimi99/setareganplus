import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { DiscountCountdown } from "@/components/registration/DiscountCountdown";
import type { CountdownBlockConfig } from "@/lib/experience/blocks/countdown";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { resolveCountdownTargetFromContext } from "@/lib/experience/public/resolve-countdown-target";

/**
 * Server-meaningful countdown: shows Jalali target even without JS.
 * Client tick uses DiscountCountdown when target is in the future.
 * Deadlines always come from ExperiencePublicRenderContext.
 */
export function CountdownBlockPublic({
  config,
  context,
}: ExperiencePublicBlockRendererProps<CountdownBlockConfig>) {
  const resolved = resolveCountdownTargetFromContext(
    context.deadlines,
    config.targetKind,
  );
  const nowMs = context.now.getTime();

  if (resolved.unavailable || !resolved.targetIso) {
    if (!config.showWhenInactive) return null;
    return (
      <section className="rounded-2xl border border-border bg-surface px-6 py-6">
        {config.heading ? (
          <h2 className="mb-2 text-base font-semibold text-primary">
            {config.heading}
          </h2>
        ) : null}
        <p className="text-sm text-muted">
          هدف شمارش معکوس در حال حاضر در دسترس نیست.
        </p>
      </section>
    );
  }

  const targetIso = resolved.targetIso;
  const endsAtMs = Date.parse(targetIso);
  if (Number.isNaN(endsAtMs)) return null;

  const expired = nowMs > endsAtMs;
  if (expired && !config.showWhenInactive) {
    return null;
  }

  const label =
    resolved.kind === "REGISTRATION_CLOSE"
      ? "پایان مهلت ثبت‌نام"
      : "پایان تخفیف";

  return (
    <section className="rounded-2xl border border-border bg-surface px-6 py-6">
      {config.heading ? (
        <h2 className="mb-4 text-base font-semibold text-primary">
          {config.heading}
        </h2>
      ) : null}
      <p className="mb-3 text-sm text-muted">
        {label}:{" "}
        <time dateTime={targetIso} className="font-medium text-foreground">
          {formatJalaliDateTimeShort(new Date(targetIso))}
        </time>
      </p>
      {expired ? (
        <p
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="status"
        >
          مهلت به پایان رسیده است.
        </p>
      ) : (
        <DiscountCountdown endsAtIso={targetIso} enabled />
      )}
    </section>
  );
}
