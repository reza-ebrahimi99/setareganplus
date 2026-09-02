import Link from "next/link";
import type { OfficeDashboardModel } from "@/lib/guidance/office/dashboard";
import {
  DISCOVER_CENTER_MAJORS,
  DISCOVER_CENTER_PROGRAMS,
  MAJOR_OFFICE_JOURNEY,
} from "@/lib/guidance/office/nav";
import { toPersianDigits } from "@/lib/persian";

export function GuidanceStudentDashboardPanels({ model }: { model: OfficeDashboardModel }) {
  const { pulse } = model;

  return (
    <div className="guidance-student-dashboard">
      <section className="guidance-student-dashboard__status" aria-labelledby="guidance-status-title">
        <div className="guidance-student-dashboard__status-head">
          <div>
            <p className="guidance-student-dashboard__eyebrow">وضعیت انتخاب رشته</p>
            <h2 id="guidance-status-title">{pulse.statusLabel}</h2>
            <p>{pulse.waitingBody}</p>
          </div>
          <div className="guidance-student-dashboard__progress" aria-label="پیشرفت مسیر">
            <span>{toPersianDigits(pulse.completionPercentage)}٪</span>
            <div>
              <i style={{ width: `${pulse.completionPercentage}%` }} />
            </div>
          </div>
        </div>
        <dl className="guidance-student-dashboard__facts">
          <div>
            <dt>فصل جاری</dt>
            <dd>{pulse.currentChapter}</dd>
          </div>
          <div>
            <dt>مرحله فعال</dt>
            <dd>{pulse.currentStepTitle}</dd>
          </div>
          <div>
            <dt>گروه آزمایشی</dt>
            <dd>{model.examGroupLabel}</dd>
          </div>
          <div>
            <dt>تصویر پرونده</dt>
            <dd>{toPersianDigits(model.intakePercent)}٪</dd>
          </div>
        </dl>
        <Link href={model.todayTask.href} className="guidance-student-dashboard__cta">
          ادامه مسیر انتخاب رشته
        </Link>
        <p className="guidance-student-dashboard__cta-hint">
          گام بعدی: {model.todayTask.title}
          {!model.packagePaid && model.packageLabel ? " · بسته هنوز فعال نشده" : ""}
        </p>
      </section>

      <section className="guidance-student-dashboard__grid" aria-label="دانشنامه و منابع">
        <Link href={DISCOVER_CENTER_MAJORS} className="guidance-student-dashboard__card">
          <span>دانشنامه</span>
          <strong>رشته‌های دانشگاهی</strong>
          <em>قبل از قفل کردن فهرست ۱۵۰، رشته را بشناسید.</em>
        </Link>
        <Link href={DISCOVER_CENTER_PROGRAMS} className="guidance-student-dashboard__card">
          <span>دانشنامه</span>
          <strong>مقاطع و دوره‌های دانشگاهی</strong>
          <em>مقطع، نوع دوره و شیوه پذیرش را جدا بفهمید.</em>
        </Link>
        <Link href={MAJOR_OFFICE_JOURNEY} className="guidance-student-dashboard__card">
          <span>مسیر همراهی</span>
          <strong>نقشه ۱۲ مرحله‌ای</strong>
          <em>از اطلاعات فردی تا تأیید نهایی فهرست.</em>
        </Link>
      </section>

      <section className="guidance-student-dashboard__checks" aria-label="وضعیت بخش‌ها">
        <h2>خلاصه پرونده</h2>
        <ul>
          <li className={model.intakeComplete ? "is-done" : undefined}>
            تصویر تحصیلی و مدارک {model.intakeComplete ? "· تکمیل" : "· ناقص"}
          </li>
          <li className={model.interestCompleted ? "is-done" : undefined}>
            آزمون رغبت {model.interestCompleted ? "· انجام شد" : "· باقی مانده"}
          </li>
          <li className={model.packagePaid ? "is-done" : undefined}>
            بسته مشاوره {model.packagePaid ? "· فعال" : "· فعال نشده"}
          </li>
        </ul>
      </section>

      <nav className="guidance-student-dashboard__legacy" aria-label="دسترسی‌های حساب">
        <Link href="/portal/student/profile">پروفایل</Link>
        <Link href="/portal/student/assessments">ارزیابی‌ها</Link>
        <Link href="/portal/student/achievements">افتخارات</Link>
        <Link href="/portal/logout">خروج</Link>
      </nav>
    </div>
  );
}
