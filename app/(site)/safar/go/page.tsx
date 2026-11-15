import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MathText } from "@/components/journey/MathText";
import { goOn, pickKey } from "@/app/(site)/safar/actions";
import { skillBySlug } from "@/lib/journey/catalog";
import { currentQuestion, type RunState } from "@/lib/journey/engine";
import { getRun, loadBank } from "@/lib/journey/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "معمای سفر" };

export default async function GoPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  const run = await getRun();
  if (!run) redirect("/safar");
  if (run.status === "DONE") redirect("/safar/power");
  const state = run.state as RunState;
  if (state.reveal) {
    const title = skillBySlug(state.reveal.skill)?.title ?? "";
    return (
      <main className="sj-wrap">
        <section className="sj-card">
          <div className="sj-where">{state.reveal.drill ? "پیچ کمکی" : "پایان این نشان"} · {title}</div>
          <h2>{state.reveal.notes.length ? "چند کلید را جور دیگری خواندی" : "این نشان برایت روشن بود"}</h2>
          <p className="sj-hint">{state.reveal.notes.length ? "این‌ها را آرام بخوان. ستاره‌ای برای برگشتن کم نمی‌شود." : "می‌توانی بروی سراغ نشان بعدی."}</p>
          {state.reveal.notes.map((n, i) => (
            <article key={i} className="sj-card sj-mt">
              <MathText text={n.stem} />
              <div className="sj-keys">
                <div className="sj-key was">
                  <em>کلیدی که تو برداشتی</em>
                  <MathText text={n.picked} />
                </div>
                <div className="sj-key main">
                  <em>کلید درست</em>
                  <MathText text={n.correct ?? ""} />
                </div>
              </div>
              <p className="sj-hint sj-mt"><MathText text={n.explain} /></p>
            </article>
          ))}
          <form action={goOn} className="sj-mt"><button className="sj-btn" type="submit">برگشت به نقشه</button></form>
        </section>
      </main>
    );
  }
  const bank = new Map((await loadBank()).map((q) => [q.id, q]));
  const q = currentQuestion(state, bank);
  if (!q) redirect("/safar/map");
  const title = skillBySlug(q.skill)?.title ?? "";
  const width = Math.round((q.index / q.total) * 100);
  return (
    <main className="sj-wrap">
      <section className="sj-card">
        <div className="sj-prog"><b>معمای {q.index} از {q.total}</b><span>{q.drill ? "پیچ کمکی" : "این نشان کوتاه است"}</span></div>
        <div className="sj-bar"><i style={{ width: `${width}%` }} /></div>
      </section>
      <section className="sj-card sj-mt">
        {sp.e && <p className="sj-err">{sp.e}</p>}
        <div className="sj-where">چالش این نشان · {title}{q.drill ? " · برگشت کوتاه" : ""}</div>
        <h2>کلید این معما کدام است؟</h2>
        <p className="sj-hint">اگر کلید را دیدی بردار. اگر آشنا نبود، پایین را بزن. ستاره‌ای برای این کار کم نمی‌شود.</p>
        <div className="sj-formula"><MathText text={q.stem} /></div>
        <form action={pickKey}>
          <input type="hidden" name="question" value={q.id} />
          {q.options.filter((o) => o.id !== "__unknown").map((o) => (
            <button key={o.id} className="sj-opt" name="option" value={o.id} type="submit"><MathText text={o.text} /></button>
          ))}
          <button className="sj-soft" name="option" value="__unknown" type="submit">هنوز به این نرسیدم<small>اشکالی ندارد؛ بعداً برمی‌گردیم سراغش</small></button>
        </form>
      </section>
      <Link className="sj-fine" href="/safar/map" style={{ display: "block" }}>بازگشت به نقشه</Link>
    </main>
  );
}
