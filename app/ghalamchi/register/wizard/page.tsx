import { Suspense } from "react";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import { qalamchiExamCatalog } from "@/lib/registration/catalogs/qalamchi-exam";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const metadata = createPageMetadata({
  path: "/ghalamchi/register/wizard",
  title: "فرم ثبت‌نام آزمون قلم‌چی | ستارگان پلاس",
  description:
    "تکمیل مرحله‌به‌مرحله اطلاعات دانش‌آموز، ولی و جزئیات آزمون قلم‌چی در ستارگان پلاس.",
  keywords: ["فرم ثبت نام قلم چی", "ستارگان پلاس", "ثبت نام آنلاین"],
  robots: { index: false, follow: true },
});

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function GhalamchiRegisterWizardPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return (
    <PublicFormShell>
      <Suspense
        fallback={
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-sm text-muted shadow-[0_20px_50px_rgb(15_23_42_/_0.08)] backdrop-blur-md">
            در حال آماده‌سازی فرم ثبت‌نام…
          </div>
        }
      >
        <RegistrationWizard
          catalog={qalamchiExamCatalog}
          initialResumeToken={params.token ?? null}
        />
      </Suspense>
    </PublicFormShell>
  );
}
