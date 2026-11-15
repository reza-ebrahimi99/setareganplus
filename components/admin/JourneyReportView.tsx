import type { ReactNode } from "react";
import { MathText } from "@/components/journey/MathText";
import { fa, prettyPhone } from "@/lib/format";
import type { JourneyReport } from "@/lib/journey/report";

function Bar({ status, ratio }: { status: string; ratio: number }) {
  const width = status === "none" ? 0 : Math.max(4, Math.round(ratio * 100));
  return (
    <div className={`jr-bar jr-${status}`} aria-hidden="true">
      <i style={{ width: `${width}%` }} />
    </div>
  );
}

export function JourneyReportView({ report, name, mobile, parentMobile, when, children }: { report: JourneyReport; name: string; mobile: string; parentMobile: string; when: string; children?: ReactNode }) {
  return (
    <div className="jr-report space-y-6 text-sm leading-7 text-ink">
      <div id="jr-top" className="space-y-6">
      <header className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <p className="text-xs font-bold text-royal">گزارش جلسهٔ انفرادی · ستارگان پلاس</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">{name}</h1>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><dt className="text-xs text-muted">پایه و رشته</dt><dd className="font-bold">{report.gradeLabel}{report.fieldLabel !== "—" ? ` · ${report.fieldLabel}` : ""}</dd></div>
          <div><dt className="text-xs text-muted">مدرسه</dt><dd className="font-bold">{report.school}</dd></div>
          <div><dt className="text-xs text-muted">موبایل</dt><dd className="font-bold" dir="ltr">{prettyPhone(mobile)}{parentMobile ? ` · خانواده ${prettyPhone(parentMobile)}` : ""}</dd></div>
          <div><dt className="text-xs text-muted">تاریخ</dt><dd className="font-bold">{when}</dd></div>
          <div><dt className="text-xs text-muted">زمان کل</dt><dd className="font-bold">{report.wallLabel}</dd></div>
          <div><dt className="text-xs text-muted">زمان روی معماها</dt><dd className="font-bold">{report.activeLabel}</dd></div>
          <div><dt className="text-xs text-muted">تعداد معما</dt><dd className="font-bold">{fa(report.puzzles)}{report.drills ? ` (پیچ کمکی ${fa(report.drills)})` : ""} · درست {fa(report.correct)}</dd></div>
          <div><dt className="text-xs text-muted">هنوز به این نرسیدم</dt><dd className="font-bold">{fa(report.unknown)}</dd></div>
          <div><dt className="text-xs text-muted">پیگیری</dt><dd className="font-bold">{report.followLabel}</dd></div>
        </dl>
        {children}
      </header>

      <section className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">خلاصه برای جلسه</h2>
        {report.summary.map((line) => <p key={line} className="mt-2">{line}</p>)}
        {report.root && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-900">ریشه: {report.root.title} · {report.root.label} · {fa(report.root.correct)} از {fa(report.root.total)}</p>}
      </section>

      <section className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">نقشهٔ مهارت‌ها</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="text-xs text-muted"><tr>
              <th className="p-2">مهارت</th><th className="p-2">کتاب</th><th className="p-2">درست</th><th className="p-2">وضعیت</th><th className="p-2">میانگین زمان</th><th className="p-2">بلد نیستم</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {report.skills.map((s) => (
                <tr key={s.slug}>
                  <td className="p-2 font-bold text-navy">{s.title}</td>
                  <td className="p-2">{s.book}</td>
                  <td className="p-2">{s.total ? `${fa(s.correct)} از ${fa(s.total)}` : "—"}</td>
                  <td className="p-2">
                    <div className="mb-1">{s.label}</div>
                    <Bar status={s.status} ratio={s.ratio} />
                  </td>
                  <td className="p-2">{s.avgLabel}</td>
                  <td className="p-2">{fa(s.unknown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">زنجیره و ریشه</h2>
        <div className="jr-chain mt-3">
          {report.chain.map((link, i) => (
            <span key={link.slug} className="contents">
              {i > 0 && <span className="jr-arrow">←</span>}
              <span className={`jr-pill ${link.status}`}>{link.title}</span>
            </span>
          ))}
        </div>
        {report.chainNotes.map((line) => <p key={line} className="mt-2">{line}</p>)}
        {!report.chainNotes.length && <p className="mt-2 text-muted">ضعفِ بعدی به یک مهارتِ قدیمیِ سست وصل نشده است.</p>}
      </section>
      </div>

      <section id="jr-mis" className="jr-break space-y-3">
        <h2 className="text-lg font-extrabold text-navy">سرنخ‌ها</h2>
        {!report.misconceptions.length && <p className="rounded-2xl border border-line bg-paper p-4">پاسخ نادرستِ برچسب‌دار نیست.</p>}
        {report.misconceptions.map((group) => (
          <article key={group.tag} className="jr-sheet rounded-2xl border border-line bg-paper p-4">
            <h3 className="font-extrabold text-navy">{group.tag} <span className="text-xs text-muted">× {fa(group.count)}</span></h3>
            <div className="mt-2 space-y-3">
              {group.items.map((item, i) => (
                <div key={`${group.tag}-${i}`} className="rounded-xl bg-ivory p-3">
                  <p className="text-xs font-bold text-royal">{item.skillTitle}</p>
                  <p className="mt-1"><MathText text={item.stem} /></p>
                  <p className="mt-1">برداشت: <MathText text={item.picked} /></p>
                  <p>کلید درست: <MathText text={item.correctText} /></p>
                  {item.explain && <p className="mt-1 text-muted"><MathText text={item.explain} /></p>}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">نشانه‌های رفتار</h2>
        <p className="mt-2">{report.stopped}</p>
        <p>{report.changeNote}</p>
        <p>{report.timed ? `${fa(report.timed)} معما زمان دارد و ${fa(report.untimed)} تا زمان ندارد.` : "زمان معماها در این سفر ذخیره نشده است."}</p>
        {report.pauses.map((line) => <p key={line}>{line}</p>)}
        {!report.pauses.length && <p>فاصلهٔ طولانی بین معماها دیده نشد.</p>}
        {!!report.fast.length && <div className="mt-3"><b>خیلی تند (احتمال حدس):</b>{report.fast.map((row) => <p key={row.stem + row.durationLabel}>{row.skill} · {row.durationLabel} · <MathText text={row.stem} /></p>)}</div>}
        {!!report.slow.length && <div className="mt-3"><b>خیلی کند:</b>{report.slow.map((row) => <p key={row.stem + row.durationLabel}>{row.skill} · {row.durationLabel} · <MathText text={row.stem} /></p>)}</div>}
        {!!report.skips.length && <div className="mt-3"><b>هنوز به این نرسیدم:</b>{report.skips.map((row) => <p key={row.stem}>{row.skill} · <MathText text={row.stem} /></p>)}</div>}
      </section>

      <section className="jr-break space-y-3">
        <h2 className="text-lg font-extrabold text-navy">دفتر پاسخ‌ها</h2>
        {report.stations.map((station) => (
          <article key={`${station.title}-${station.drill}`} className="jr-sheet rounded-2xl border border-line bg-paper p-4">
            <h3 className="font-extrabold text-navy">{station.title}{station.drill ? " · پیچ کمکی" : ""}</h3>
            {station.rows.map((row, i) => (
              <div key={i} className="mt-3 border-t border-line pt-3">
                <p><MathText text={row.stem} /></p>
                <ul className="mt-1 space-y-1">
                  {row.options.map((o) => (
                    <li key={o.text} className={o.correct ? "font-bold text-emerald-800" : o.picked ? "font-bold text-rose-800" : ""}>
                      <MathText text={o.text} />
                      {o.correct ? " · کلید درست" : ""}
                      {o.picked ? " · برداشت دانش‌آموز" : ""}
                    </li>
                  ))}
                </ul>
                {row.unknown && <p>برداشت: هنوز به این نرسیدم</p>}
                <p className="text-xs text-muted">زمان: {row.durationLabel}{row.misconception ? ` · ${row.misconception}` : ""}</p>
              </div>
            ))}
          </article>
        ))}
      </section>

      <section id="jr-plan" className="jr-break jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">برنامهٔ جلسه</h2>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 font-bold text-amber-950">پیشنهاد: {report.recommendation}. {report.recommendationWhy}</p>
        <ol className="mt-3 space-y-3">
          {report.topics.map((topic, i) => (
            <li key={topic.title}>
              <b>{fa(i + 1)}. {topic.title}</b>
              <p>{topic.why}</p>
              {topic.prompts.map((prompt) => <p key={prompt} className="text-muted"><MathText text={prompt} /></p>)}
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {report.weeks.map((week) => (
            <div key={week.title} className="rounded-xl bg-ivory p-3">
              <b>{week.title}</b>
              <p>{week.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="jr-parent" className="jr-sheet rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-lg font-extrabold text-navy">نسخهٔ کوتاه برای خانواده</h2>
        {report.parent.map((line) => <p key={line} className="mt-2">{line}</p>)}
      </section>
    </div>
  );
}
