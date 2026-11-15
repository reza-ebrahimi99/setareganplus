import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapBoard, type MapStation } from "@/components/journey/MapBoard";
import { ceilingBlurb, skillBySlug } from "@/lib/journey/catalog";
import { getRun } from "@/lib/journey/store";
import type { RunState } from "@/lib/journey/engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نقشهٔ سفر" };

const BOOK = ["", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم"];

export default async function MapPage() {
  const run = await getRun();
  if (!run) redirect("/safar");
  const state = run.state as RunState;
  const cursor = state.cursor ?? 0;
  const now = state.queue?.[cursor];
  const slugs = [...new Set((state.queue ?? []).filter((q) => !q.drill).map((q) => q.skill))];
  const stations: MapStation[] = slugs.map((slug) => {
    const skill = skillBySlug(slug);
    const main = (state.queue ?? []).findIndex((q) => q.skill === slug && !q.drill);
    const answers = run.answers.filter((a) => a.skillSlug === slug && !a.drill);
    const stars = Math.min(3, answers.filter((a) => a.correct).length);
    let mark: MapStation["state"] = "locked";
    if (now?.skill === slug) mark = "now";
    else if (run.status === "DONE" || (main >= 0 && main < cursor)) mark = "passed";
    return { slug, title: skill?.title ?? slug, book: BOOK[skill?.taughtGrade ?? 0] ?? "", state: mark, stars: mark === "passed" ? Math.max(1, stars) : stars };
  });
  const here = stations.find((s) => s.state === "now");
  return (
    <main className="sj-wrap">
      <div className="sj-desk">
        <div>
          <div className="sj-cheer">
            {run.name.split(" ")[0]}، {here ? <>نشان <em>{here.title}</em> جای توست.</> : run.status === "DONE" ? "این سفر تمام شده." : "نقشه آماده‌ست."}
            {now?.drill ? " یک پیچ کوتاه به نشان قبلی برگشته‌ایم تا ریشه پیدا شود." : ""}
          </div>
          <p className="sj-rule">{ceilingBlurb(run.grade, run.field)}</p>
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
        {stations.map((s) => (
          <div key={s.slug} className="sj-row">
            <span>{s.title}</span>
            <i>{s.state === "now" ? "اینجا" : s.state === "passed" ? "★".repeat(s.stars) : "بسته"} · کتاب {s.book}</i>
          </div>
        ))}
      </div>
    </main>
  );
}
