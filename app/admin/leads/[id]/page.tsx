import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadDetailEmpty } from "@/components/admin/LeadDetailEmpty";

export const metadata: Metadata = {
  title: "پرونده متقاضی",
};

export default function LeadDetailPage() {
  return (
    <>
      <AdminPageHeader
        title="پرونده متقاضی"
        description="جزئیات پرونده پس از فعال‌سازی زیرساخت داده و احراز هویت در دسترس خواهد بود."
      />
      <LeadDetailEmpty />
    </>
  );
}
