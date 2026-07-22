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

export default function GhalamchiRegisterWizardPage() {
  return (
    <PublicFormShell>
      <RegistrationWizard catalog={qalamchiExamCatalog} />
    </PublicFormShell>
  );
}
