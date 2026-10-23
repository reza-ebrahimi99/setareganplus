import type { Metadata } from "next";
import { FormPage } from "@/components/site/FormPage";

export const metadata: Metadata = { title: "پیش‌ثبت‌نام", description: "فرم پیش‌ثبت‌نام خدمات مؤسسه علمی ستارگان نسیم‌شهر." };

export default function Register() {
  return <FormPage slug="pre-registration" eyebrow="پیش‌ثبت‌نام" />;
}
