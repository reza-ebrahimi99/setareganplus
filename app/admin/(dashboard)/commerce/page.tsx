import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "استاربوک · مدیریت",
};

const links = [
  {
    href: "/admin/commerce/products",
    title: "کاتالوگ BookSku",
    description: "همان کتاب واحد استاربوک؛ ویژه، تصویر، موجودی",
  },
  {
    href: "/admin/commerce/orders",
    title: "سفارش‌ها و عملیات",
    description: "تولید، دریافت، تحویل حضوری",
  },
  {
    href: "/admin/commerce/categories",
    title: "کالکشن‌ها",
    description: "دسته‌بندی‌های فروشگاه عمومی",
  },
  {
    href: "/admin/commerce/production",
    title: "صف تولید",
    description: "چاپ امروز",
  },
  {
    href: "/admin/commerce/pickup",
    title: "میز دریافت",
    description: "QR و امضا",
  },
  {
    href: "/admin/books/catalog/import",
    title: "ورود اکسل",
    description: "بالک کاتالوگ روی BookSku",
  },
  {
    href: "/admin/commerce/payments",
    title: "پرداخت‌ها",
    description: "تسویه سفارش‌های فروشگاه",
  },
  {
    href: "/admin/commerce/performance",
    title: "گزارش کارکنان",
    description: "تولید و تحویل",
  },
  {
    href: "/admin/commerce/merch",
    title: "ویترین و کمپین",
    description: "کتاب ویژه، بنر کالکشن، کمپین خانه",
  },
  {
    href: "/admin/commerce/seo",
    title: "سئو",
    description: "متای BookSku برای گوگل",
  },
  {
    href: "/admin/commerce/coupons",
    title: "کوپن‌ها",
    description: "کد نمایشی سبد دانش‌آموز",
  },
  {
    href: "/admin/commerce/reviews",
    title: "نظرات",
    description: "پیشنهاد دبیر و امتیاز دانش‌آموز",
  },
  {
    href: "/admin/commerce/reports",
    title: "گزارش استاربوک",
    description: "فروش، موجودی، KPI عملیات",
  },
] as const;

export default async function AdminCommerceHomePage() {
  const session = await requirePermission("commerce.view");
  const organizationId = session.organization.id;

  const [skuCount, visibleCount, featuredCount, orderCount] = await Promise.all([
    prisma.bookSku.count({ where: { organizationId, deletedAt: null } }),
    prisma.bookSku.count({
      where: { organizationId, deletedAt: null, isVisible: true },
    }),
    prisma.bookSku.count({
      where: { organizationId, deletedAt: null, isFeatured: true },
    }),
    prisma.commerceOrder.count({ where: { organizationId } }),
  ]);

  const cards = [
    { label: "کتاب در کاتالوگ", value: skuCount },
    { label: "نمایش در استاربوک", value: visibleCount },
    { label: "ویژه / بنر خانگی", value: featuredCount },
    { label: "سفارش‌ها", value: orderCount },
  ];

  return (
    <>
      <AdminPageHeader
        title="استاربوک"
        description="مدیریت فروشگاه عمومی روی همان BookSku واحد — بدون کاتالوگ دوم"
        breadcrumbs={adminBreadcrumbs.commerce}
        compact
      />
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="admin-card p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {toPersianDigits(card.value)}
            </p>
          </article>
        ))}
      </section>
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
