import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { RegistrationReceipt } from "@/components/registration/RegistrationReceipt";
import { getRegistrationByNumber } from "@/lib/registration/service";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = {
  params: Promise<{ registrationNumber: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { registrationNumber } = await params;
  return createPageMetadata({
    path: `/ghalamchi/register/receipt/${registrationNumber}`,
    title: `رسید ثبت‌نام ${registrationNumber} | ستارگان پلاس`,
    description: "رسید ثبت‌نام آزمون قلم‌چی در ستارگان پلاس.",
    robots: { index: false, follow: false },
  });
}

export default async function RegistrationReceiptPage({ params }: PageProps) {
  const { registrationNumber } = await params;
  const registration = await getRegistrationByNumber(
    decodeURIComponent(registrationNumber),
  );
  if (!registration) notFound();

  return (
    <PublicFormShell>
      <RegistrationReceipt
        registration={registration}
        paymentMessage={
          registration.paymentMessage ??
          "وضعیت ثبت‌نام را از روی رسید پیگیری کنید."
        }
      />
    </PublicFormShell>
  );
}
