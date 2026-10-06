import Link from "next/link";
import { AcademyBenefitGrid } from "@/components/academy/AcademyBenefitGrid";
import { AcademyHeroVisual } from "@/components/academy/AcademyHeroVisual";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyCourseCard } from "@/components/academy/AcademyCourseCard";
import { resolveAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import {
  listIndividualVideoProducts,
  listPublishedCourses,
  listRecentVideoProgress,
} from "@/lib/academy/catalog";
import { formatTomanFromRials } from "@/lib/academy/money";

export default async function AcademyHomePage() {
  const organizationId = await getAcademyOrganizationId();
  const session = await resolveAcademySession();
  const [courses, videos, recentProgress] = await Promise.all([
    listPublishedCourses(organizationId),
    listIndividualVideoProducts(organizationId),
    session
      ? listRecentVideoProgress(organizationId, session.userId)
      : Promise.resolve([]),
  ]);
  const featured = courses.filter((c) => c.featured).slice(0, 6);
  const displayCourses = featured.length > 0 ? featured : courses.slice(0, 6);

  return (
    <AcademyShell>
      <section className="academy-hero">
        <div className="academy-container academy-hero-grid">
          <div>
            <span className="academy-hero-badge">آکادمی ستارگان</span>
            <h1 className="academy-hero-title">یاد بگیر. تمرین کن. مسلط شو.</h1>
            <p className="academy-hero-lead">
              دوره‌ها و ویدئوهای آموزشی پریمیوم با دسترسی شخصی، ادامه تماشا از آخرین
              نقطه، و پخش امن روی موبایل و کامپیوتر.
            </p>
            <div className="academy-hero-actions">
              <Link href="/courses" className="academy-btn academy-btn-primary">
                مشاهده دوره‌ها
              </Link>
              {session ? (
                <Link href="/account/library" className="academy-btn academy-btn-ghost">
                  کتابخانه من
                </Link>
              ) : (
                <Link href="/login" className="academy-btn academy-btn-ghost">
                  ورود به حساب
                </Link>
              )}
            </div>
          </div>
          <AcademyHeroVisual />
        </div>
      </section>

      {session && recentProgress.length > 0 ? (
        <section className="academy-section academy-container">
          <div className="academy-section-head">
            <div>
              <h2 className="academy-section-title">ادامه تماشا</h2>
              <p className="academy-section-sub">از همان لحظه‌ای که متوقف کردید</p>
            </div>
            <Link href="/account/library" className="academy-btn academy-btn-link">
              کتابخانه
            </Link>
          </div>
          <div className="academy-continue-list">
            {recentProgress.map((row) => (
              <Link
                key={row.lesson.id}
                href={`/watch/${row.lesson.id}`}
                className="academy-continue-item"
              >
                <div>
                  <p className="text-xs text-muted">{row.lesson.course.title}</p>
                  <p className="font-semibold">{row.lesson.title}</p>
                </div>
                <span className="academy-btn academy-btn-secondary academy-btn-sm">
                  ادامه
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="academy-section academy-container">
        <div className="academy-section-head">
          <div>
            <h2 className="academy-section-title">دوره‌های منتخب</h2>
            <p className="academy-section-sub">مسیر یادگیری ساختاریافته</p>
          </div>
          <Link href="/courses" className="academy-btn academy-btn-link">
            همه دوره‌ها
          </Link>
        </div>
        {displayCourses.length === 0 ? (
          <div className="academy-card academy-empty">
            <div className="academy-empty-icon" aria-hidden>
              ★
            </div>
            <p className="academy-empty-title">دوره‌های جدید به‌زودی منتشر می‌شوند.</p>
            <p className="academy-empty-desc">
              به محض انتشار اولین دوره، از همین صفحه دسترسی خواهید داشت.
            </p>
          </div>
        ) : (
          <div className="academy-course-grid">
            {displayCourses.map((course) => (
              <AcademyCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {videos.length > 0 ? (
        <section className="academy-section academy-container">
          <h2 className="academy-section-title">جدیدترین ویدئوها</h2>
          <p className="academy-section-sub">خرید تکی درس‌های منتخب</p>
          <ul className="academy-course-grid mt-6">
            {videos.slice(0, 4).map((v) => (
              <li key={v.id} className="academy-card academy-course-body">
                <Link href={`/videos/${v.slug}`} className="block">
                  <p className="academy-course-meta">{v.course.title}</p>
                  <p className="academy-course-title">{v.title}</p>
                  <p className="academy-course-price mt-3" dir="ltr">
                    {formatTomanFromRials(v.individualPriceRials ?? 0)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="academy-section academy-section-surface">
        <div className="academy-container">
          <h2 className="academy-section-title text-center">چرا آکادمی ستارگان؟</h2>
          <p className="academy-section-sub text-center mx-auto max-w-xl">
            تجربه‌ای شبیه پلتفرم‌های آموزشی حرفه‌ای، با تمرکز بر نتیجه و دسترسی امن.
          </p>
          <div className="mt-8">
            <AcademyBenefitGrid />
          </div>
        </div>
      </section>

      <section className="academy-section academy-container">
        <h2 className="academy-section-title text-center">چطور کار می‌کند؟</h2>
        <ol className="academy-steps mt-8">
          {["ثبت‌نام", "خرید", "کتابخانه من", "تماشا"].map((step, i) => (
            <li key={step} className="academy-card academy-step-card">
              <span className="academy-step-num">{i + 1}</span>
              <span className="mt-3 block font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="academy-section academy-container pb-16">
        <div className="academy-cta-band">
          <h2 className="text-lg font-bold">آماده شروع یادگیری هستید؟</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            دوره‌ها را مرور کنید یا وارد کتابخانه شخصی خود شوید.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/courses" className="academy-btn academy-btn-primary">
              مشاهده دوره‌ها
            </Link>
            <Link
              href={session ? "/account/library" : "/login"}
              className="academy-btn academy-btn-secondary"
            >
              {session ? "کتابخانه من" : "ورود"}
            </Link>
          </div>
        </div>
      </section>
    </AcademyShell>
  );
}
