import { notFound } from "next/navigation";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { RegistrationReceipt } from "@/components/registration/RegistrationReceipt";
import { getRegistrationByNumber } from "@/lib/registration/service";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

type PageProps = {
  params: Promise<{ slug: string; registrationNumber: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug, registrationNumber } = await params;
  return createPageMetadata({
    path: `/register/${slug}/receipt/${registrationNumber}`,
    title: `رسید ثبت‌نام ${registrationNumber} | ستارگان پلاس`,
    description: "رسید ثبت‌نام آنلاین در ستارگان پلاس.",
    robots: { index: false, follow: false },
  });
}

export default async function PublicRegistrationFlowReceiptPage({
  params,
}: PageProps) {
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
