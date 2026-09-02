/**
 * Guidance Platform — external candidate onboarding (identity intake).
 * Reached after portal OTP when a new Candidate account is provisioned.
 */

import { redirect } from "next/navigation";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { PortraitMark } from "@/components/guidance/office/illustrations";
import { GuidanceOnboardingForm } from "@/components/guidance/onboarding/GuidanceOnboardingForm";
import { candidateNeedsGuidanceOnboarding } from "@/lib/guidance/external-candidate";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";
import { loadGuidanceOnboardingRecord } from "@/lib/guidance/onboarding";
import { listHighSchoolMajorOptionsForForm } from "@/lib/guidance/onboarding-options";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { IRAN_PROVINCES } from "@/lib/registration/iran-locations";
import { requireStudentPortalAccess } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function GuidanceOnboardingPage() {
  const context = await requireStudentPortalAccess();
  const guidanceOn = await isGuidanceEnabled(context.organization.id);
  if (!guidanceOn) {
    redirect("/portal/student");
  }

  const studentId = context.activeLink.studentId;
  if (!studentId) {
    redirect("/portal/select-account");
  }

  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (!needs) {
    redirect(GUIDANCE_PLATFORM_HOME);
  }

  const parsed = normalizeIranianMobile(context.user.mobile ?? "");
  if (!parsed.ok) {
    redirect("/portal/login");
  }

  const provinces = [...IRAN_PROVINCES];
  const majors = [...listHighSchoolMajorOptionsForForm()];
  const record = await loadGuidanceOnboardingRecord({
    organizationId: context.organization.id,
    userId: context.user.id,
  });
  const draft = record?.draft;

  return (
    <div className="chamber" dir="rtl">
      <div className="chamber-body">
          <ChamberPage
            kicker="ورود به دفتر"
            title="خوش آمدید. آینده از همین اتاق شروع می‌شود."
            lead="این فرم دولتی نیست. دو تصویر می‌سازیم: کی هستید، و از کدام مسیر تحصیلی می‌آیید. هر بخش ذخیره می‌شود؛ می‌توانید بروید و برگردید."
            now="هویت، سپس تصویر تحصیلی"
            art={<PortraitMark />}
            artCaption="پرتره ورود"
          >
            <GuidanceOnboardingForm
              mobile={parsed.normalized}
              provinces={provinces}
              majors={majors}
          initial={
            draft
              ? {
                  fullName: draft.fullName,
                  nationalId: draft.nationalId,
                  birthDate: draft.birthDate,
                  gender: draft.gender,
                  province: draft.province,
                  city: draft.city,
                  graduationYear: draft.graduationYear,
                  highSchoolMajor: draft.highSchoolMajor,
                  schoolName: draft.schoolName,
                  parentMobile: draft.parentMobile,
                  quota: draft.quota,
                }
              : undefined
          }
            />
          </ChamberPage>
        </div>
    </div>
  );
}
