import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadOfficeIntakeContext } from "@/lib/guidance/office/intake-loader";
import { MAJOR_OFFICE_GRADES } from "@/lib/guidance/office/intake-href";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پرونده تحصیلی",
  robots: { index: false, follow: false },
};

export default async function OfficeAcademicPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const intake = await loadOfficeIntakeContext(context, studentId);
  if (!intake) redirect(GUIDANCE_ONBOARDING_PATH);

  return (
    <div className="office-intake-page">
      <header>
        <p>گام ۲ از مسیر مشاوره</p>
        <h1>پرونده تحصیلی</h1>
        <p>
          مدرسه، رشته، سهمیه و سال فارغ‌التحصیلی. نمرات امتحان نهایی در گام بعد
          وارد می‌شود.
        </p>
      </header>
      <GuidanceOnboardingForm
        mobile={intake.mobile}
        provinces={intake.provinces}
        majors={intake.majors}
        initial={intake.draft}
        mode="academic"
        continueHref={MAJOR_OFFICE_GRADES}
      />
    </div>
  );
}
