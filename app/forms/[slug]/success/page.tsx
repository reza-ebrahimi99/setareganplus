import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { loadPublicFormBySlug } from "@/lib/forms/load-public-form";

export const dynamic = "force-dynamic";

type SuccessPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: SuccessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicFormBySlug(slug);

  return {
    title: result.ok ? `ثبت موفق · ${result.data.version.title}` : "ثبت موفق",
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormSuccessPage({
  params,
}: SuccessPageProps) {
  const { slug } = await params;
  const result = await loadPublicFormBySlug(slug);

  // Success page only makes sense for forms that (still) have a public identity.
  // If the slug never existed, 404. If paused after submit, still show generic confirmation.
  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  const confirmationMessage =
    result.ok && result.data.version.confirmationMessage.trim()
      ? result.data.version.confirmationMessage.trim()
      : "اطلاعات شما با موفقیت ثبت شد.";

  const title = result.ok ? result.data.version.title : "فرم";

  return (
    <PublicFormShell>
      <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:px-10">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700"
        >
          ✓
        </div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">
          ثبت با موفقیت انجام شد
        </h1>
        <p className="mt-2 text-sm text-muted">{title}</p>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-foreground sm:text-base">
          {confirmationMessage}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </PublicFormShell>
  );
}
