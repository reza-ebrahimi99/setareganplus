import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CheckInForm } from "@/components/admin/bookings/CheckInForm";
import { adminBreadcrumbs } from "@/content/admin";

export default async function BookingCheckInPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><AdminPageHeader title="پذیرش نوبت" description="کد QR یا شناسه رزرو را برای ثبت ورود وارد کنید." breadcrumbs={adminBreadcrumbs.bookings} compact /><CheckInForm token={token} /></>;
}
