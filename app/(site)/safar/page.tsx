import type { Metadata } from "next";
import Link from "next/link";
import { EntryForm } from "@/components/journey/EntryForm";
import { GRADE_LABEL } from "@/lib/journey/catalog";
import { LANDING_INTRO, LANDING_PERKS } from "@/lib/journey/cheers";
import { getRun } from "@/lib/journey/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "سفر ستاره‌ها", description: "ماجراجویی رایگان ریاضی؛ خودت را بشناس، ستاره جمع کن و نقشهٔ قدرت‌هایت را ببین." };

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
      <p className="sj-intro">{LANDING_INTRO}</p>
      <ul className="sj-perks">
        {LANDING_PERKS.map((perk) => (
          <li key={perk.title}>
            <span className="sj-perk" aria-hidden="true"><PerkIcon name={perk.title} /></span>
            <span>{perk.text}</span>
          </li>
        ))}
      </ul>
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

function PerkIcon({ name }: { name: string }) {
  if (name === "کلید") {
    return <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="8" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 12h9l-1.6 2.1H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  }
  if (name === "ستاره") {
    return <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 3.5l2.2 4.7 5.1.6-3.8 3.4.9 5-4.4-2.4-4.4 2.4.9-5L4.7 8.8l5.1-.6z" fill="currentColor" /></svg>;
  }
  if (name === "دل") {
    return <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19s-7-4.2-7-9a4 4 0 017-2 4 4 0 017 2c0 4.8-7 9-7 9z" fill="currentColor" /></svg>;
  }
  if (name === "گوشی") {
    return <svg viewBox="0 0 24 24" width="20" height="20"><rect x="8" y="3" width="8" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="17.5" r="0.8" fill="currentColor" /></svg>;
  }
  return <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 5v2.2M12 17v2M5 12h2.2M17 12H19M12 12l3-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
