import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { BooksMark } from "@/components/guidance/office/illustrations";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadOfficeIntakeContext } from "@/lib/guidance/office/intake-loader";
import { MAJOR_OFFICE_GRADES } from "@/lib/guidance/office/intake-href";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تصویر تحصیلی",
  robots: { index: false, follow: false },
};

export default async function OfficeAcademicPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const intake = await loadOfficeIntakeContext(context, studentId);
  if (!intake) redirect(GUIDANCE_ONBOARDING_PATH);

  return (
    <ChamberPage
      kicker="اتاق تصویر تحصیلی"
      title="مدرسه، سهمیه و سالی که از آن می‌آیید"
      lead="این‌ها اعداد اداری نیستند. زمینهٔ انتخاب رشته‌اند. نمرات را در اتاق بعد، یکی‌یکی می‌چینیم."
      now="پس از این تصویر، شناخت توانایی‌ها"
      art={<BooksMark />}
      artCaption="کتاب و کارنامه"
    >
      <GuidanceOnboardingForm
        mobile={intake.mobile}
        provinces={intake.provinces}
        majors={intake.majors}
        initial={intake.draft}
        mode="academic"
        continueHref={MAJOR_OFFICE_GRADES}
      />
    </ChamberPage>
  );
}
