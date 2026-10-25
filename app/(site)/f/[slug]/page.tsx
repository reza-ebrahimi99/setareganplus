import type { Metadata } from "next";
import { FormPage } from "@/components/site/FormPage";
import { getPublicForm } from "@/lib/forms/public";
import { buildMeta } from "@/lib/seo";
import { mdToText } from "@/lib/markdown";
import { priceBadge } from "@/lib/forms/badges";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const form = await getPublicForm(slug);
  if (!form) return { title: "فرم پیدا نشد", robots: { index: false } };
  const desc = form.description ? mdToText(form.description).slice(0, 160) : `${form.title} — ثبت‌نام آنلاین مؤسسه علمی ستارگان نسیم‌شهر (${priceBadge(form).text}).`;
  return buildMeta({
    title: form.title,
    description: desc,
    path: slug === "pre-registration" ? "/register" : `/f/${slug}`,
    images: form.coverImage ? [{ url: form.coverImage, alt: form.title }] : undefined,
    // closed forms stay reachable for people with the link but leave the index
    noindex: form.state === "closed",
  });
}

export default async function PublicForm({ params }: P) {
  const { slug } = await params;
  return <FormPage slug={decodeURIComponent(slug)} eyebrow="ثبت‌نام آنلاین" />;
}
