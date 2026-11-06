import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { fa } from "@/lib/format";
import { J_MONTHS, toJalali } from "@/lib/jalali";
import { sourceLabel, tehranDayStart } from "@/lib/analytics/classify";
import { getAnalyticsReport, resolveReportRange, type SourceRow } from "@/lib/analytics/report";
import { PageTitle, Panel, Empty } from "@/components/admin/ui";

export const metadata = { title: "آمار بازدید" };
export const dynamic = "force-dynamic";

const PRESETS = [
  ["today", "امروز"],
  ["7", "۷ روز"],
  ["30", "۳۰ روز"],
  ["90", "۹۰ روز"],
] as const;

function faDay(iso: string) {
  const j = toJalali(tehranDayStart(iso));
  return `${fa(j.jd)} ${J_MONTHS[j.jm - 1]} ${fa(j.jy)}`;
}

function pct(part: number, total: number) {
  if (!total) return "۰٪";
  return fa(Math.round((part / total) * 100)) + "٪";
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requirePerm("analytics.view");
  const sp = await searchParams;
  const range = resolveReportRange(sp);
  const report = await getAnalyticsReport(range.from, range.to);
  const maxDay = Math.max(1, ...report.byDay.map((d) => d.hits));
  const href = (extra: Record<string, string>) => `/admin/analytics?${new URLSearchParams(extra).toString()}`;

  return (
    <>
      <PageTitle
        title="آمار بازدید"
        sub={`${faDay(report.from)} تا ${faDay(report.to)} · بدون حساب آمار شخص ثالث`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map(([key, label]) => (
          <Link
            key={key}
            href={href({ range: key })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${range.key === key ? "bg-navy text-white" : "bg-paper text-navy ring-1 ring-line hover:ring-navy/30"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="label">از</span>
          <input type="date" name="from" defaultValue={report.from} className="input" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="label">تا</span>
          <input type="date" name="to" defaultValue={report.to} className="input" dir="ltr" />
        </label>
        <button className="btn-navy px-4 py-2.5 text-sm">نمایش</button>
        <p className="pb-2 text-xs text-muted">فیلد تاریخ میلادی است؛ بازهٔ شمسی همان بالای صفحه است.</p>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="بازدید صفحه‌ها" value={fa(report.visits)} />
        <Stat label="بازدیدکننده یکتا" value={fa(report.uniques)} hint="شناسه روزانه؛ در چند روز، هر روز جدا شمرده می‌شود" />
        <Stat label="شروع تست مطالعه" value={fa(report.quizStarts)} hint="درخواست کد تأیید تازه" />
        <Stat label="هدیه / اتمام تست" value={fa(report.rewards)} hint={report.quizCompletions !== report.rewards ? `${fa(report.quizCompletions)} مورد با منبع ثبت‌شده` : "هر لید یک کد هدیه"} />
      </div>

      <Panel title="روند بازدید" className="mb-6">
        {report.visits === 0 ? (
          <Empty>در این بازه هنوز بازدیدی ثبت نشده است.</Empty>
        ) : (
          <>
            <div className="flex h-28 items-end gap-px" aria-hidden>
              {report.byDay.map((d) => (
                <div key={d.day} className="group relative min-w-0 flex-1">
                  <div className="w-full rounded-t bg-navy/80" style={{ height: `${Math.max(d.hits ? 8 : 2, Math.round((d.hits / maxDay) * 112))}px` }} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy px-2 py-1 text-[10px] text-white group-hover:block">
                    {faDay(d.day)} · {fa(d.hits)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>{faDay(report.from)}</span>
              <span>{faDay(report.to)}</span>
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="منبع ورود">
          {report.sources.length === 0 ? (
            <p className="text-sm text-muted">بازدیدی برای تفکیک منبع نیست.</p>
          ) : (
            <SourceBars rows={report.sources} total={report.visits} />
          )}
        </Panel>

        <Panel title="کمپین‌ها">
          {report.campaigns.length === 0 ? (
            <p className="text-sm leading-7 text-muted">هنوز ورودی با utm_campaign ثبت نشده است. لینک‌های آماده پایین صفحه است.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-right text-xs text-muted">
                    <th className="py-2 font-semibold">کمپین</th>
                    <th className="py-2 font-semibold">منبع</th>
                    <th className="py-2 font-semibold">بازدید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.campaigns.map((c) => (
                    <tr key={`${c.source}|${c.medium}|${c.campaign}`}>
                      <td className="py-2 font-semibold text-navy" dir="ltr">{c.campaign}</td>
                      <td className="py-2 text-muted">{sourceLabel(c.source)}{c.medium ? ` · ${c.medium}` : ""}</td>
                      <td className="py-2 font-extrabold">{fa(c.hits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="پربازدیدترین خبرها" className="mt-6">
        {report.news.length === 0 ? (
          <p className="text-sm text-muted">در این بازه بازدید صفحهٔ خبر ثبت نشده است.</p>
        ) : (
          <PathTable rows={report.news} />
        )}
      </Panel>

      <Panel title="پربازدیدترین صفحه‌ها" className="mt-6">
        {report.pages.length === 0 ? (
          <p className="text-sm text-muted">صفحه‌ای در این بازه ثبت نشده است.</p>
        ) : (
          <PathTable rows={report.pages} />
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="تست مطالعه بر اساس منبع">
          {report.quizBySource.length === 0 && report.rewards === 0 ? (
            <p className="text-sm text-muted">در این بازه شروع یا اتمامی ثبت نشده است.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-right text-xs text-muted">
                    <th className="py-2 font-semibold">منبع</th>
                    <th className="py-2 font-semibold">شروع</th>
                    <th className="py-2 font-semibold">اتمام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.quizBySource.map((r) => (
                    <tr key={r.source}>
                      <td className="py-2 font-semibold text-navy">{sourceLabel(r.source)}</td>
                      <td className="py-2">{fa(r.starts)}</td>
                      <td className="py-2 font-extrabold">{fa(r.completions)}</td>
                    </tr>
                  ))}
                  {report.unattributedRewards > 0 && (
                    <tr>
                      <td className="py-2 text-muted">بدون رویداد منبع</td>
                      <td className="py-2 text-muted">—</td>
                      <td className="py-2 font-extrabold">{fa(report.unattributedRewards)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-6 text-muted">
            شروع یعنی یک کد تأیید تازه، و اتمام یعنی ساخت کد هدیه. تعداد هدیه از خود لیدهای تست است
            {report.unattributedRewards > 0 ? "؛ اختلاف، لیدهایی است که پیش از این آمار یا بدون منبع ثبت شده‌اند." : "."}
          </p>
        </Panel>

        <Panel title="کد معرف (ref) در لیدهای تست">
          {report.referrals.length === 0 ? (
            <p className="text-sm text-muted">در این بازه کد معرف قابل‌نمایشی نیست.</p>
          ) : (
            <ul className="space-y-2">
              {report.referrals.map((r) => (
                <li key={r.label} className="flex items-center justify-between rounded-xl bg-ivory px-3 py-2 text-sm">
                  <span className="font-mono" dir="ltr">{r.label}</span>
                  <span className="font-extrabold text-navy">{fa(r.count)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-6 text-muted">
            این فهرست همان فیلد referral لید است (پارامتر ref، معمولاً کد هدیهٔ یک دانش‌آموز دیگر) و جدا از utm_source است.
            {report.hiddenReferrals > 0 ? ` ${fa(report.hiddenReferrals)} مورد به‌خاطر شباهت به شماره یا ایمیل نشان داده نشد.` : ""}
          </p>
        </Panel>
      </div>

      <Panel title="لینک‌های برچسب‌دار و حریم خصوصی" className="mt-6">
        <div className="space-y-3 text-sm leading-7 text-muted">
          <p>
            دسترسی این صفحه <b className="text-ink">آمار بازدید و منابع</b> است (<span dir="ltr" className="font-mono text-xs">analytics.view</span>).
            مدیر اصلی آن را دارد. در قالب‌های آمادهٔ همکاران نیست و باید جداگانه داده شود.
          </p>
          <p>روی لینک پیامک یا بله این پارامترها را بگذارید. منبع تا نیمه‌شب به وقت تهران روی همان مرورگر می‌ماند.</p>
          <ul className="space-y-2">
            {[
              ["پیامک، تست مطالعه", "https://setareganplus.ir/test-motalee?utm_source=sms&utm_medium=sms&utm_campaign=aban1404"],
              ["بله، صفحهٔ اصلی", "https://setareganplus.ir/?utm_source=bale&utm_medium=social&utm_campaign=aban1404"],
              ["پیامک، یک خبر", "https://setareganplus.ir/news/SLUG?utm_source=sms&utm_medium=sms&utm_campaign=khabar"],
              ["تست با کد معرف و پیامک", "https://setareganplus.ir/test-motalee?ref=CODE&utm_source=sms&utm_medium=sms&utm_campaign=aban1404"],
            ].map(([label, url]) => (
              <li key={url}>
                <span className="font-semibold text-navy">{label}</span>
                <span className="mt-0.5 block break-all font-mono text-xs text-ink" dir="ltr">{url}</span>
              </li>
            ))}
          </ul>
          <p>
            ورود از گوگل، اینستاگرام، تلگرام، ایتا و روبیکا اگر برچسب نداشته باشد از آدرس ارجاع‌دهنده شناخته می‌شود.
            بدون ارجاع و بدون برچسب، «ورود مستقیم» است. ربات‌ها و پیش‌بارگذاری لینک شمرده نمی‌شوند.
          </p>
          <p>
            آدرس کامل IP، نام، شماره و متن کوئری (از جمله توکن و شماره) ذخیره نمی‌شود. شناسهٔ بازدیدکننده هر نیمه‌شب عوض می‌شود و بین روزها به هم وصل نمی‌گردد.
            رویداد خام حدود ۱۲۰ روز می‌ماند و بعد به جمع روزانه بدون شناسه فشرده می‌شود. جمع روزانه حدود ۲۶ ماه نگه داشته می‌شود.
            صفحهٔ پرداخت، رسید جزوه و لینک‌های دارای توکن ثبت نمی‌شوند.
          </p>
        </div>
      </Panel>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-5 text-muted">{hint}</p>}
    </div>
  );
}

function SourceBars({ rows, total }: { rows: SourceRow[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.hits));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.source}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-semibold text-navy">{sourceLabel(r.source)}</span>
            <span className="text-muted">{fa(r.hits)} · {pct(r.hits, total)} · {fa(r.uniques)} یکتا</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ivory">
            <div className="h-full rounded-full bg-navy" style={{ width: `${Math.max(4, Math.round((r.hits / max) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PathTable({ rows }: { rows: { path: string; title: string | null; hits: number; uniques: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-right text-xs text-muted">
            <th className="py-2 font-semibold">صفحه</th>
            <th className="py-2 font-semibold">بازدید</th>
            <th className="py-2 font-semibold">یکتا</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.path}>
              <td className="py-2">
                <Link href={r.path} target="_blank" className="font-semibold text-navy hover:text-edu">{r.title || r.path}</Link>
                {r.title && <span className="mt-0.5 block font-mono text-[11px] text-muted" dir="ltr">{r.path}</span>}
              </td>
              <td className="py-2 font-extrabold">{fa(r.hits)}</td>
              <td className="py-2 text-muted">{fa(r.uniques)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
