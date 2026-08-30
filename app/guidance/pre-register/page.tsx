/**
 * Guidance ERP — public pre-registration page (/guidance/pre-register).
 */

import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { GuidancePreRegisterForm } from "@/components/guidance/PreRegisterForm";
import { assertGuidancePublicEnabledOrNotFound } from "@/lib/guidance/require-public";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";
import {
  ensureDefaultStudentGrades,
  listPublicStudentGrades,
} from "@/lib/website/student-grades";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  path: "/guidance/pre-register",
  title: "پیش‌ثبت‌نام انتخاب رشته | ستارگان پلاس",
  description:
    "پیش‌ثبت‌نام در سامانه جامع انتخاب رشته ستارگان پلاس؛ تشکیل پرونده و تأیید موبایل.",
  keywords: ["پیش ثبت نام انتخاب رشته", "ستارگان پلاس", "کنکور"],
  robots: { index: false, follow: false },
});

export default async function GuidancePreRegisterPage() {
  await assertGuidancePublicEnabledOrNotFound();
  const organization = await getPublicOrganizationBySlug();
  await ensureDefaultStudentGrades(organization.id);
  const grades = await listPublicStudentGrades(organization.id);

  return (
    <InnerPageLayout
      activePath="/guidance"
      breadcrumbs={[
        { label: "صفحه اصلی", href: "/" },
        { label: "سامانه جامع انتخاب رشته", href: "/guidance" },
        { label: "پیش‌ثبت‌نام" },
      ]}
      title="پیش‌ثبت‌نام انتخاب رشته"
      subtitle="اطلاعات پایه و گروه آزمایشی را وارد کنید؛ پس از تأیید موبایل، پرونده شما تشکیل می‌شود."
      eyebrow="گام اول"
    >
      <div className="mx-auto max-w-xl">
        <GuidancePreRegisterForm grades={grades} />
      </div>
    </InnerPageLayout>
  );
}
