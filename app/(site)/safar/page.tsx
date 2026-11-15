import type { Metadata } from "next";
import Link from "next/link";
import { EntryForm } from "@/components/journey/EntryForm";
import { GRADE_LABEL } from "@/lib/journey/catalog";
import { getRun } from "@/lib/journey/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سفر ستاره‌ها", description: "ماجراجویی رایگان ریاضی در ستارگان پلاس؛ از کتاب پایه‌های قبل تا نقشهٔ قدرت‌های خودت." };

export default async function SafarEntry({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  const run = await getRun().catch(() => null);
  return (
    <main className="sj-wrap">
      <section className="sj-banner">
        <img src="/journey/map.webp" alt="" />
        <div className="sj-veil">
          <div className="sj-kicker">ماجراجویی رایگان ریاضی</div>
          <h1 className="sj-h1">سفر ستاره‌ها</h1>
        </div>
      </section>
      <p className="sj-hint sj-mt">از مهارت‌هایی راه می‌افتی که کتابِ پایه‌های قبل نوشته. هر ایستگاه یک نشان روی نقشه است. آخر مسیر، نقشهٔ قدرت‌هایت را فقط خودت می‌بینی.</p>
      <div className="sj-paths">
        <div className="sj-path"><span>پنجم</span><b>تا پایان کتاب چهارم</b></div>
        <div className="sj-path"><span>نهم</span><b>تا پایان کتاب هشتم</b></div>
        <div className="sj-path"><span>دوازدهم ریاضی</span><b>تا پایان کتاب یازدهم ریاضی</b></div>
      </div>
      {run?.status === "OPEN" && (
        <p className="sj-note sj-mt">یک سفر باز به نام {run.name} ({GRADE_LABEL[run.grade] ?? ""}) داری. <Link href="/safar/map"><b>ادامهٔ همان نقشه</b></Link></p>
      )}
      {run?.status === "DONE" && (
        <p className="sj-note sj-mt">نقشهٔ قدرت‌های {run.name} آماده است. <Link href="/safar/power"><b>دیدنش</b></Link></p>
      )}
      <EntryForm error={sp.e} />
      <p className="sj-fine">چون تو لایق بهترینی</p>
    </main>
  );
}
