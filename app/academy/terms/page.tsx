import { AcademyShell } from "@/components/academy/AcademyShell";

export const metadata = { title: "قوانین استفاده" };

export default function AcademyTermsPage() {
  return (
    <AcademyShell>
      <article className="mx-auto max-w-3xl px-4 py-12 prose prose-sm text-muted">
        <h1 className="text-2xl font-bold text-primary not-prose">قوانین استفاده از محتوا</h1>
        <ul className="mt-6 list-disc space-y-3 pr-5">
          <li>حساب کاربری شخصی است و انتقال دسترسی به دیگران مجاز نیست.</li>
          <li>بازنشر یا توزیع غیرمجاز ویدئوها ممنوع است.</li>
          <li>
            دسترسی ممکن است بر اساس سیاست دستگاه و نشست پخش محدود شود (قابل تنظیم در
            سامانه).
          </li>
          <li>
            مدت دسترسی پس از خرید طبق شرایط هر دوره/ویدئو (مادام‌العمر یا محدود به
            تعداد روز) اعمال می‌شود.
          </li>
        </ul>
        <p className="mt-8 text-xs">
          این متن قابل ویرایش توسط مجموعه است و جایگزین مشاوره حقوقی نیست.
        </p>
      </article>
    </AcademyShell>
  );
}
