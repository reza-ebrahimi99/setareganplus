import Link from "next/link";
import { Star, Icon } from "@/components/site/Star";
import { QUIZ_PATH } from "@/lib/quiz/content";

export function HomeQuizBanner({ title, intro }: { title: string; intro: string }) {
  return (
    <section className="relative overflow-hidden border-b border-royal/15 bg-gradient-to-l from-[#eef2ff] via-white to-[#fff8e8]">
      <Star className="pointer-events-none absolute -left-10 -top-10 size-40 text-royal/[0.07]" />
      <div className="container-x relative flex flex-col items-stretch gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-royal-2 text-2xl text-white shadow-lg shadow-royal/30">🧠</span>
          <div>
            <p className="text-xs font-bold text-royal">کمپین ویژه دانش‌آموزان نسیم‌شهر</p>
            <h2 className="mt-1 text-lg font-black text-navy sm:text-xl">{title}</h2>
            <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-7 text-muted">{intro}</p>
          </div>
        </div>
        <Link href={QUIZ_PATH} className="btn-gold shrink-0 justify-center px-6 py-3 text-sm sm:text-base">
          شروع تست رایگان
          <Icon name="arrow" className="size-4 rotate-180" strokeWidth={2.4} />
        </Link>
      </div>
    </section>
  );
}
