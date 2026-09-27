import { AcademyShell } from "@/components/academy/AcademyShell";

export const metadata = { title: "حریم خصوصی" };

export default function AcademyPrivacyPage() {
  return (
    <AcademyShell>
      <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed text-muted">
        <h1 className="text-2xl font-bold text-primary">حریم خصوصی</h1>
        <p className="mt-6">
          اطلاعات ورود (شماره موبایل)، سوابق خرید، پیشرفت تماشا و دستگاه‌های ثبت‌شده
          برای ارائه خدمات آموزشی و امنیت محتوا نگهداری می‌شود. رمز یک‌بارمصرف و
          توکن‌های پخش به‌صورت امن ذخیره می‌شوند و در پاسخ‌های عمومی افشا نمی‌گردند.
        </p>
        <p className="mt-4">
          برای درخواست‌های مرتبط با داده‌های شخصی از مسیر پشتیبانی آکادمی اقدام کنید.
        </p>
      </article>
    </AcademyShell>
  );
}
