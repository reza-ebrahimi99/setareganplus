import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { FormPage } from "@/components/site/FormPage";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("register");
}

export default function Register() {
  return <FormPage slug="pre-registration" eyebrow="پیش‌ثبت‌نام" />;
}
