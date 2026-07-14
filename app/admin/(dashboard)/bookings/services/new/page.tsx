import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateBookingServiceForm } from "@/components/admin/bookings/BookingForms";
import { adminBreadcrumbs } from "@/content/admin";

export default function NewBookingServicePage() {
  return <><AdminPageHeader title="تعریف خدمت نوبت‌دهی" description="اطلاعات پایه خدمت و محدودیت‌های رزرو را وارد کنید." breadcrumbs={adminBreadcrumbs.bookingServicesNew} compact /><CreateBookingServiceForm /></>;
}
