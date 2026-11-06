import type { Metadata } from "next";
import { BookWizard } from "@/components/consult/BookWizard";
import { StudentGate } from "@/components/consult/StudentGate";
import { PageHero } from "@/components/site/Star";
import { monthOf } from "@/lib/consult/availability";
import { getConsultSettings } from "@/lib/consult/settings";
import { clearStudentCookie, getStudentSession } from "@/lib/consult/students";
import { redirect } from "next/navigation";
import { SPECIAL_PATH } from "@/lib/consult/constants";

export const metadata: Metadata = {
  title: "جلسهٔ ویژهٔ دانش‌آموزان",
  description: "رزرو جلسهٔ مشاوره برای دانش‌آموزان ثبت‌شدهٔ ستارگان، با کد آموزشگاه.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function leave() {
  "use server";
  await clearStudentCookie();
  redirect(SPECIAL_PATH);
}

export default async function SpecialConsultPage() {
  const [settings, session, month] = await Promise.all([getConsultSettings(), getStudentSession(), Promise.resolve(monthOf())]);
  return (
    <>
      <PageHero
        eyebrow="جلسهٔ ویژه"
        title="نوبت اختصاصی شما"
        text="این صفحه فقط با کدی که آموزشگاه به دانش‌آموز ستارگان داده باز می‌شود. کد را جایی عمومی نگذارید."
        crumbs="جلسهٔ ویژه"
      />
      <div className="container-x relative z-10 -mt-10 pb-8">
        {!settings.specialOpen ? (
          <div className="card px-6 py-12 text-center">
            <h2 className="text-xl font-black text-navy">رزرو جلسهٔ ویژه موقتاً بسته است</h2>
            <p className="mt-2 text-sm text-muted">با آموزشگاه هماهنگ کنید.</p>
          </div>
        ) : session ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
              <p className="font-bold text-navy">سلام {session.fullName.split(" ")[0]}، وقت ویژه‌ات اینجاست.</p>
              <form action={leave}><button className="text-sm font-semibold text-muted">خروج از این کد</button></form>
            </div>
            <BookWizard
              audience="SPECIAL"
              student={{ fullName: session.fullName, grade: session.grade, hasPhone: session.hasPhone, maskedPhone: session.maskedPhone }}
              initialMonth={month}
              slotMinutes={settings.slotMinutes}
            />
          </div>
        ) : (
          <StudentGate />
        )}
      </div>
    </>
  );
}
