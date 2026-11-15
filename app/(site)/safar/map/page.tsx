import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapBoard, type MapStation } from "@/components/journey/MapBoard";
import { mapCheer, stationCheer } from "@/lib/journey/cheers";
import { ceilingBlurb, skillBySlug } from "@/lib/journey/catalog";
import { getRun } from "@/lib/journey/store";
import { stationMarks, type RunState } from "@/lib/journey/engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نقشهٔ سفر" };

const BOOK = ["", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم"];

export default async function MapPage() {
  const run = await getRun();
  if (!run) redirect("/safar");
  const state = run.state as RunState;
  const cursor = state.cursor ?? 0;
  const now = state.queue?.[cursor];
  const marks = stationMarks(state.queue ?? [], cursor, run.status === "DONE");
  const stations: MapStation[] = marks.map((mark) => {
    const skill = skillBySlug(mark.slug);
    const answers = run.answers.filter((a) => a.skillSlug === mark.slug && !a.drill);
    const stars = Math.min(3, answers.filter((a) => a.correct).length);
    return {
      slug: mark.slug,
      title: skill?.title ?? mark.slug,
      book: BOOK[skill?.taughtGrade ?? 0] ?? "",
      state: mark.state,
      stars: mark.state === "passed" ? Math.max(1, stars) : stars,
    };
  });
  const here = stations.find((s) => s.state === "now");
  const passed = stations.filter((s) => s.state === "passed").length;
  return (
    <main className="sj-wrap">
      <div className="sj-desk">
        <div>
          <div className="sj-cheer">
            {run.name.split(" ")[0]}، {here ? <>نشان <em>{here.title}</em> جای توست.</> : run.status === "DONE" ? "این سفر تمام شده." : "نقشه آماده‌ست."}
            {now?.drill ? " یک پیچ کوتاه برای محکم کردن یک نشان قدیمی؛ بعد همین راه ادامه دارد." : ""}
          </div>
          <p className="sj-rule">{ceilingBlurb(run.grade, run.field)}</p>
          {passed > 0 && <p className="sj-boost">{mapCheer(passed)}</p>}
          <MapBoard stations={stations} />
          <div className="sj-legend">
            <span><b style={{ background: "#8e342c" }} /> مُهر فتح‌شده</span>
            <span><b style={{ background: "#c9963e" }} /> جای مسافر</span>
            <span><b style={{ background: "#c8ae8a" }} /> هنوز بسته</span>
          </div>
          {run.status === "DONE" ? (
            <Link className="sj-btn sj-go" href="/safar/power">نقشهٔ قدرت‌های من</Link>
          ) : (
            <Link className="sj-btn sj-go" href="/safar/go">ورود به نشان</Link>
          )}
        </div>
        <aside className="sj-card" style={{ display: "none" }} />
      </div>
      <div className="sj-list">
        {stations.map((s, i) => {
          const meta = s.state === "now" ? "اینجا" : s.state === "passed" ? "★".repeat(s.stars) : "بسته";
          const body = (
            <>
              <span>
                {s.title}
                {s.state === "passed" && <small className="sj-boost">{stationCheer(i)}</small>}
              </span>
              <i>{meta} · کتاب {s.book}</i>
            </>
          );
          if (s.state === "now") {
            return (
              <Link key={s.slug} className="sj-row now" href="/safar/go">
                {body}
              </Link>
            );
          }
          return (
            <div key={s.slug} className={`sj-row ${s.state}`} aria-disabled={s.state === "locked"}>
              {body}
            </div>
          );
        })}
      </div>
    </main>
  );
}
