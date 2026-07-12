import type { Metadata } from "next";
import { AdminMetricGrid } from "@/components/admin/AdminMetricGrid";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadFiltersPreview } from "@/components/admin/LeadFiltersPreview";
import { LeadTableEmpty } from "@/components/admin/LeadTableEmpty";
import { adminBreadcrumbs, crmSummaryStats } from "@/content/admin";

export const metadata: Metadata = {
  title: "متقاضیان و CRM",
};

export default function AdminLeadsPage() {
  return (
    <>
      <AdminPageHeader
        title="متقاضیان و CRM"
        description="پیش‌نمایش فهرست متقاضیان. هیچ رکوردی از پایگاه داده خوانده نمی‌شود."
        breadcrumbs={adminBreadcrumbs.leads}
        compact
      />

      <div className="space-y-6">
        <AdminMetricGrid
          items={crmSummaryStats}
          heading="خلاصه وضعیت متقاضیان"
          headingId="crm-summary-heading"
          compact
        />
        <LeadFiltersPreview />
        <LeadTableEmpty />
      </div>
    </>
  );
}
