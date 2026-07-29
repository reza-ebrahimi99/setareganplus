import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "فروشگاه",
};

export default async function AdminCommerceDashboardPage() {
  await requirePermission("commerce.view");

  const links = [
    { href: "/admin/commerce/categories", label: "دسته‌بندی‌ها" },
    { href: "/admin/commerce/products", label: "محصولات" },
    { href: "/admin/commerce/orders", label: "سفارش‌ها" },
    { href: "/admin/commerce/payments", label: "پرداخت‌ها" },
  ] as const;

  return (
    <>
      <AdminPageHeader
        title="فروشگاه"
        description="زیرساخت تجارت الکترونیک — کاتالوگ، سفارش و پرداخت (فاز Foundation)"
        breadcrumbs={adminBreadcrumbs.commerce}
        compact
      />

      <AdminSection title="میان‌برها" headingId="commerce-shortcuts">
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </AdminSection>

      <div className="mt-6">
        <AdminEmptyState
          title="داشبورد فروشگاه به‌زودی تکمیل می‌شود"
          description="در این فاز فقط زیرساخت داده، دسترسی‌ها و ناوبری آماده شده است. فروشگاه عمومی و تسویه‌حساب در فازهای بعدی اضافه می‌شوند."
        />
      </div>
    </>
  );
}
