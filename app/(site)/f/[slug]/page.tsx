import type { Metadata } from "next";
import { FormPage } from "@/components/site/FormPage";
import { getPublicForm } from "@/lib/forms/public";
import { buildMeta } from "@/lib/seo";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const form = await getPublicForm(slug);
  if (!form) return { title: "فرم پیدا نشد", robots: { index: false } };
  return buildMeta({
    title: form.title,
    description: form.description || `${form.title} — فرم آنلاین مؤسسه علمی ستارگان نسیم‌شهر.`,
    path: slug === "pre-registration" ? "/register" : `/f/${slug}`,
  });
}

export default async function PublicForm({ params }: P) {
  const { slug } = await params;
  return <FormPage slug={decodeURIComponent(slug)} eyebrow="فرم آنلاین" />;
}
