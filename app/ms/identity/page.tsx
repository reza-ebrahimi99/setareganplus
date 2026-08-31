import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AtelierPage } from "@/components/guidance/office/AtelierPage";
import { PortraitMark } from "@/components/guidance/office/illustrations";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";
import { loadOfficeIntakeContext } from "@/lib/guidance/office/intake-loader";
import { MAJOR_OFFICE_ACADEMIC } from "@/lib/guidance/office/intake-href";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "کی هستید",
  robots: { index: false, follow: false },
};

export default async function OfficeIdentityPage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.activeLink.studentId;
  if (!studentId) redirect("/portal/select-account");

  const intake = await loadOfficeIntakeContext(context, studentId);
  if (!intake) redirect(GUIDANCE_ONBOARDING_PATH);

  return (
    <AtelierPage
      kicker="اتاق هویت"
      title="قبل از هر انتخاب، باید بدانیم که هستید"
      lead="نام، کد ملی و جای زندگی‌تان سنگ بنای پرونده است. هر کلمه خودکار ذخیره می‌شود؛ می‌توانید بروید و آرام برگردید."
      now="تکمیل هویت، بعد تصویر تحصیلی"
      art={<PortraitMark />}
      artCaption="پرتره پرونده"
    >
      <GuidanceOnboardingForm
        mobile={intake.mobile}
        provinces={intake.provinces}
        majors={intake.majors}
        initial={intake.draft}
        mode="identity"
        continueHref={MAJOR_OFFICE_ACADEMIC}
      />
    </AtelierPage>
  );
}
