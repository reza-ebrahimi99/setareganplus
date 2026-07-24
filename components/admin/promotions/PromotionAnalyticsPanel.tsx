import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";
import type { PromotionAnalytics } from "@/lib/promotions/analytics";

type Props = {
  analytics: PromotionAnalytics;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

export function PromotionAnalyticsPanel({ analytics }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold text-primary">آمار واقعی پروموشن</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="کل استفاده"
          value={toPersianDigits(String(analytics.totalUsage))}
        />
        <Stat
          label="ثبت‌نام موفق"
          value={toPersianDigits(String(analytics.successfulRegistrations))}
        />
        <Stat
          label="باقی‌مانده سقف"
          value={
            analytics.remainingUsage == null
              ? "نامحدود"
              : toPersianDigits(String(analytics.remainingUsage))
          }
        />
        <Stat
          label="نرخ تبدیل"
          value={`${toPersianDigits(String(Math.round(analytics.conversionRate * 100)))}٪`}
        />
        <Stat
          label="جمع تخفیف"
          value={formatTomansFromRials(analytics.discountAmountRials)}
        />
        <Stat
          label="درآمد"
          value={formatTomansFromRials(analytics.revenueRials)}
        />
        <Stat
          label="میانگین تخفیف"
          value={formatTomansFromRials(analytics.averageDiscountRials)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted">مصرف روزانه</h3>
          {analytics.daily.length === 0 ? (
            <p className="text-sm text-muted">داده‌ای نیست.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {analytics.daily.map((d) => (
                <li
                  key={d.date}
                  className="flex justify-between gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                >
                  <span>{d.label}</span>
                  <span className="text-muted">
                    {toPersianDigits(String(d.count))} ·{" "}
                    {formatTomansFromRials(d.revenueRials)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted">
            جریان‌های برتر
          </h3>
          {analytics.topFlows.length === 0 ? (
            <p className="text-sm text-muted">داده‌ای نیست.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {analytics.topFlows.map((f) => (
                <li
                  key={f.flowKey}
                  className="flex justify-between gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                >
                  <span>{f.title}</span>
                  <span className="text-muted">
                    {toPersianDigits(String(f.count))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AttributionList title="منابع برتر" rows={analytics.topSources} />
        <AttributionList title="کمپین‌های برتر" rows={analytics.topCampaigns} />
        <AttributionList
          title="Landingهای برتر"
          rows={analytics.topLandingPages}
        />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-muted">
          آخرین استفاده‌ها
        </h3>
        {analytics.recentUsages.length === 0 ? (
          <p className="text-sm text-muted">استفاده‌ای ثبت نشده.</p>
        ) : (
          <ul className="space-y-2">
            {analytics.recentUsages.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              >
                <a
                  href={`/admin/registrations/${u.registrationId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {toPersianDigits(u.registrationNumber)}
                </a>
                <span className="ms-2 text-xs text-muted">{u.flowKey}</span>
                <p className="mt-0.5 text-xs text-muted">
                  تخفیف {formatTomansFromRials(u.discountAmount)} · نهایی{" "}
                  {formatTomansFromRials(u.finalAmountRials)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AttributionList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex justify-between gap-2 rounded-lg border border-border/60 px-2 py-1.5"
            >
              <span className="truncate" dir="ltr">
                {row.key}
              </span>
              <span className="text-muted">
                {toPersianDigits(String(row.count))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
