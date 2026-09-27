import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyCourseCard } from "@/components/academy/AcademyCourseCard";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import {
  listIndividualVideoProducts,
  listPublishedCourses,
} from "@/lib/academy/catalog";
import { formatTomanFromRials } from "@/lib/academy/money";

export default async function AcademyHomePage() {
  const organizationId = await getAcademyOrganizationId();
  const [courses, videos] = await Promise.all([
    listPublishedCourses(organizationId),
    listIndividualVideoProducts(organizationId),
  ]);
  const featured = courses.filter((c) => c.featured).slice(0, 6);
  const displayCourses = featured.length > 0 ? featured : courses.slice(0, 6);

  return (
    <AcademyShell activePath="/">
      <section className="academy-hero px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium text-secondary">Star Academy</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-snug sm:text-4xl">
            یاد بگیر. تمرین کن. مسلط شو.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
            دوره‌ها و ویدئوهای آموزشی پریمیوم با دسترسی شخصی، ادامه تماشا از آخرین
            نقطه، و پخش امن روی موبایل و کامپیوتر.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className="academy-btn-primary">
              مشاهده دوره‌ها
            </Link>
            <Link href="/login" className="academy-btn-ghost">
              ورود به حساب
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary">دوره‌های منتخب</h2>
            <p className="mt-1 text-sm text-muted">مسیر یادگیری ساختاریافته</p>
          </div>
          <Link href="/courses" className="text-sm font-medium text-secondary">
            همه دوره‌ها
          </Link>
        </div>
        {displayCourses.length === 0 ? (
          <div className="academy-card p-10 text-center text-muted">
            به‌زودی دوره‌های جدید منتشر می‌شود.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayCourses.map((course) => (
              <AcademyCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-surface px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "آموزش هدفمند", d: "سرفصل مرحله‌به‌مرحله با تمرکز بر نتیجه" },
            { t: "دسترسی شخصی", d: "کتابخانه اختصاصی پس از خرید" },
            { t: "موبایل و دسکتاپ", d: "تجربه یکسان در همه دستگاه‌ها" },
            { t: "ادامه تماشا", d: "از همان لحظه‌ای که متوقف شدید" },
          ].map((item) => (
            <div key={item.t}>
              <h3 className="font-semibold text-primary">{item.t}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {videos.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-bold text-primary">جدیدترین ویدئوها</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {videos.slice(0, 4).map((v) => (
              <li key={v.id} className="academy-card p-4">
                <Link href={`/videos/${v.slug}`} className="block">
                  <p className="text-xs text-muted">{v.course.title}</p>
                  <p className="mt-1 font-semibold text-primary">{v.title}</p>
                  <p className="mt-2 text-sm text-secondary" dir="ltr">
                    {formatTomanFromRials(v.individualPriceRials ?? 0)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-center text-xl font-bold text-primary">چطور کار می‌کند؟</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-4">
          {["ثبت‌نام", "خرید", "کتابخانه من", "تماشا"].map((step, i) => (
            <li
              key={step}
              className="academy-card flex flex-col items-center p-5 text-center"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="mt-3 font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </AcademyShell>
  );
}
