import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { ensureBookAgencyProfile } from "@/lib/books/agency-profile";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { BookAgencyProfileForm } from "./BookAgencyProfileForm";

export const metadata: Metadata = {
  title: "تنظیمات آژانس کتاب",
};
export const dynamic = "force-dynamic";

export default async function BookAgencySettingsPage() {
  const session = await requireBookCommerceAccess("books.settings.manage");
  const profile = await ensureBookAgencyProfile(session.organization.id);

  return (
    <div>
      <AdminPageHeader
        title="تنظیمات آژانس کتاب"
        description="این تنظیمات فقط روی فرآیندهای بازرگانی کتاب اثر می‌گذارد و به سایر ماژول‌ها ربطی ندارد."
        breadcrumbs={adminBreadcrumbs.booksSettings}
      />
      <BookAgencyProfileForm
        legalName={profile.legalName ?? ""}
        defaultDepositPercent={profile.defaultDepositPercent}
        defaultReservationTtlHours={profile.defaultReservationTtlHours}
        allowIssueUnpaid={profile.allowIssueUnpaid}
        installmentEnabled={profile.installmentEnabled}
        countGiftsInGmv={profile.countGiftsInGmv}
        showStudentNamesToTeachers={profile.showStudentNamesToTeachers}
      />
    </div>
  );
}
