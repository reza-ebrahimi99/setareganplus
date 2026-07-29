import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "فروشگاه",
};

const links = [
  {
    href: "/admin/commerce/products",
    title: "محصولات",
    description: "مدیریت جزوه‌ها و اقلام کاتالوگ",
  },
  {
    href: "/admin/commerce/orders",
    title: "سفارش‌ها",
    description: "پیگیری پرداخت و تحویل حضوری",
  },
  {
    href: "/admin/commerce/categories",
    title: "دسته‌بندی‌ها",
    description: "ساختار دسته‌های فروشگاه",
  },
  {
    href: "/admin/commerce/payments",
    title: "پرداخت‌ها",
    description: "نمای کلی پرداخت‌های فروشگاه",
  },
] as const;

export default async function AdminCommerceHomePage() {
  await requirePermission("commerce.view");

  return (
    <>
      <AdminPageHeader
        title="فروشگاه"
        description="فروش جزوه فیزیکی با تحویل حضوری از مؤسسه آموزشی ستارگان"
        breadcrumbs={adminBreadcrumbs.commerce}
        compact
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40"
          >
            <h2 className="text-base font-bold text-foreground">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
