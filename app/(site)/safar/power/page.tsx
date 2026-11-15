import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MathText } from "@/components/journey/MathText";
import { COURSE_TITLE, STATUS_LABEL, skillBySlug } from "@/lib/journey/catalog";
import { scoreSkills } from "@/lib/journey/engine";
import { getRun, loadBank } from "@/lib/journey/store";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { BALE_ADMIN_CHAT_URL } from "@/lib/bale";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نقشهٔ قدرت‌های من" };

export default async function PowerPage() {
  const run = await getRun();
  if (!run) redirect("/safar");
  if (run.status !== "DONE") redirect("/safar/map");
  const scores = scoreSkills(run.grade, run.field, run.answers);
  const strong = scores.filter((s) => s.status !== "grow");
  const grow = scores.filter((s) => s.status === "grow");
  const courses = [...new Set(grow.map((s) => s.courseSlug).filter(Boolean) as string[])].slice(0, 3);
  const bank = await loadBank();
  const byId = new Map(bank.map((q) => [q.id, q]));
  const misses = run.answers.filter((a) => !a.correct && !a.drill).slice(0, 3);
  const settings = await getSettings().catch(() => null);
  const phones = settings?.contact.phones ?? [];
  const root = grow.find((s) => s.drillRatio !== null && s.drillRatio < 0.5);
  return (
    <main className="sj-wrap">
      <section className="sj-hero">
        <div className="sj-kicker">سفر تا پایان کتاب پایهٔ قبل تمام شد</div>
        <h1 className="sj-h1">{run.name.split(" ")[0]}، این‌ها مال توست</h1>
        <p className="sj-hint">اول قدرت‌ها. بعد جاهایی که یک قدم آنجا، ساحل را روشن‌تر می‌کند.</p>
        {root && <p className="sj-note">ریشهٔ یکی از نشان‌ها در «{root.title}» است. همان‌جا را محکم کن.</p>}
        <div className="sj-pills">
          <span className="sj-pill"><i className="sj-dot" style={{ background: "#8e342c" }} /> قدرت</span>
          <span className="sj-pill"><i className="sj-dot" style={{ background: "#3e8f8a" }} /> در مسیر ستاره</span>
          <span className="sj-pill"><i className="sj-dot" style={{ background: "#c9963e" }} /> نقطهٔ رشد</span>
        </div>
      </section>
      <h2 className="sj-sec">کجاها درخشیدی</h2>
      <div className="sj-card">
        {(strong.length ? strong : scores.slice(0, 2)).map((s) => (
          <div key={s.slug} className={`sj-skill st-${s.status}`}>
            <div className="top"><span>{s.title}</span><span>{STATUS_LABEL[s.status]}</span></div>
            <div className="sj-meter"><i style={{ width: `${Math.round(s.ratio * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      {grow.length > 0 && (
        <>
          <h2 className="sj-sec">قدم بعدی رشد<small>ریشه اغلب در نشان‌های قدیمی‌تر است</small></h2>
          <div className="sj-card">
            {grow.map((s) => (
              <div key={s.slug} className="sj-skill st-grow">
                <div className="top"><span>{s.title}</span><span>{STATUS_LABEL[s.status]}</span></div>
                <div className="sj-meter"><i style={{ width: `${Math.max(8, Math.round(s.ratio * 100))}%` }} /></div>
              </div>
            ))}
          </div>
        </>
      )}
      {misses.length > 0 && <h2 className="sj-sec">کلیدهایی که جور دیگری خوانده شد</h2>}
      {misses.map((a) => {
        const q = byId.get(a.questionId);
        const picked = a.unknown ? "هنوز به این نرسیدم" : q?.options.find((o) => o.id === a.optionId)?.text ?? "";
        return (
          <article key={a.id} className="sj-card sj-mt">
            <h2 style={{ fontSize: 15 }}>{skillBySlug(a.skillSlug)?.title}</h2>
            {q && <MathText text={q.stem} />}
            <p className="sj-hint">کلیدی که برداشته شد:</p>
            <MathText text={picked} />
            <p className="sj-hint">{a.misconception ? `${a.misconception} ` : ""}{q?.explain}</p>
          </article>
        );
      })}
      {courses.length > 0 && (
        <>
          <h2 className="sj-sec">کلاس‌هایی که به همین نشان‌ها می‌خورند</h2>
          {courses.map((slug) => (
            <Link key={slug} className="sj-course" href={`/classes/${slug}`}>
              <span className="sj-play">▶</span>
              <span><b>{COURSE_TITLE[slug] ?? slug}</b><small>مهندس رضا ابراهیمی</small></span>
            </Link>
          ))}
        </>
      )}
      <section className="sj-cta">
        <h2>قدم بعدی را با هم بچینیم</h2>
        <p>یک گفت‌وگوی رایگان با نمایندگی قلم‌چی نسیم‌شهر، تا همین نقشه را کنار هم بخوانیم.</p>
        <div className="sj-contacts">
          {phones.map((p) => <a key={p} href={telHref(p)}>{prettyPhone(p)}</a>)}
          <a href={BALE_ADMIN_CHAT_URL}>بله</a>
          <a href="https://wa.me/989384567054">واتساپ</a>
        </div>
        <Link className="sj-btn sj-mt" href="/moshavere" style={{ display: "flex", background: "#fff6df" }}>رزرو گفت‌وگوی رایگان</Link>
      </section>
      <p className="sj-fine">این نقشه پیش کسی اعلام نمی‌شود.</p>
    </main>
  );
}
