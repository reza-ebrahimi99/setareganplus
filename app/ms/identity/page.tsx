import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadOfficeIntakeContext } from "@/lib/guidance/office/intake-loader";
import { MAJOR_OFFICE_ACADEMIC } from "@/lib/guidance/office/intake-href";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "هویت",
  robots: { index: false, follow: false },
};

export default async function OfficeIdentityPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const intake = await loadOfficeIntakeContext(context, studentId);
  if (!intake) redirect(GUIDANCE_ONBOARDING_PATH);

  return (
    <div className="office-intake-page">
      <header>
        <p>گام ۱ از مسیر مشاوره</p>
        <h1>اطلاعات هویتی</h1>
        <p>
          نام، کد ملی و محل سکونت پرونده شماست. هر تغییر خودکار ذخیره می‌شود.
        </p>
      </header>
      <GuidanceOnboardingForm
        mobile={intake.mobile}
        provinces={intake.provinces}
        majors={intake.majors}
        initial={intake.draft}
        mode="identity"
        continueHref={MAJOR_OFFICE_ACADEMIC}
      />
    </div>
  );
}
