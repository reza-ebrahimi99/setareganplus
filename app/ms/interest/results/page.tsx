import type { Metadata } from "next";
import Link from "next/link";
import { ChamberEmpty } from "@/components/guidance/office/ChamberScene";
import { ChamberPage } from "@/components/guidance/office/ChamberPage";
import { UnfinishedMark } from "@/components/guidance/office/illustrations";
import { AssessmentResultsDashboard } from "@/components/guidance/office/assessment/AssessmentResultsDashboard";
import { loadOfficeInterestResults } from "@/lib/guidance/office/interest-report-loader";
import { requireOfficeGuidancePlan } from "@/lib/guidance/office/interest-access";
import { MAJOR_OFFICE_INTEREST } from "@/lib/guidance/office/nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نتیجه آزمون رغبت",
  robots: { index: false, follow: false },
};

export default async function OfficeInterestResultsPage() {
  const { context, plan } = await requireOfficeGuidancePlan();
  const view = await loadOfficeInterestResults({
    organizationId: context.organization.id,
    plan,
  });

  if (!view) {
    return (
      <ChamberPage
        kicker="برگ تحلیل"
        title="هنوز صورت‌فلکی کامل نیست"
        lead="آزمون را ادامه دهید تا گزارش خانواده باز شود."
        art={<UnfinishedMark />}
        artCaption="ناتمام"
      >
        <ChamberEmpty
          title="نتیجه‌ای روی میز نیست"
          body="هر بخش که پاسخ دهید ذخیره می‌شود. لازم نیست یک‌نفس تمام شود."
          action={
            <Link href={MAJOR_OFFICE_INTEREST} className="chamber-go">
              ادامه کشف
            </Link>
          }
        />
      </ChamberPage>
    );
  }

  return <AssessmentResultsDashboard model={view.dashboard} view={view} />;
}
