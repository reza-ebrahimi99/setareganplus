import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadFiltersPreview } from "@/components/admin/LeadFiltersPreview";
import { LeadTableEmpty } from "@/components/admin/LeadTableEmpty";

export const metadata: Metadata = {
  title: "متقاضیان و CRM",
};

export default function AdminLeadsPage() {
  return (
    <>
      <AdminPageHeader
        title="متقاضیان و CRM"
        description="پیش‌نمایش فهرست متقاضیان. هیچ رکوردی از پایگاه داده خوانده نمی‌شود و فرم عمومی هنوز متصل نشده است."
      />

      <div className="space-y-6">
        <LeadFiltersPreview />
        <LeadTableEmpty />
      </div>
    </>
  );
}
