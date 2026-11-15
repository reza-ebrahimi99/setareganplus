import Link from "next/link";

export function HomeJourneyBanner() {
  return (
    <section className="relative overflow-hidden border-b border-[#e0cba6] bg-gradient-to-l from-[#fff6df] via-[#fffaf2] to-[#e7f4f2]">
      <div className="container-x relative flex flex-col items-stretch gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#8e342c]">نمایندگی قلم‌چی نسیم‌شهر · مدرس: مهندس رضا ابراهیمی</p>
          <h2 className="mt-1 text-lg font-black text-[#3f2d1c] sm:text-xl">سفر ستاره‌ها</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-[#7a6248]">یک ماجراجویی رایگان روی نقشهٔ کهنه. خودت را بشناس، ستاره جمع کن و آخرش نقشهٔ قدرت‌هایت را ببین.</p>
        </div>
        <Link href="/safar" className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#f0d48a] to-[#c9963e] px-6 py-3 text-sm font-black text-[#3f2d1c] shadow-[inset_0_1px_0_#fff1c9]">
          شروع ماجراجویی
        </Link>
      </div>
    </section>
  );
}
