import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import {
  FormsList,
  type AdminFormListItem,
} from "@/components/admin/forms/FormsList";
import { adminBreadcrumbs } from "@/content/admin";
import { getAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "فرم‌ساز",
};

async function loadForms(
  organizationId: string,
): Promise<AdminFormListItem[]> {
  const forms = await prisma.form.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      purpose: true,
      mode: true,
      publishedVersionId: true,
      updatedAt: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          versionNumber: true,
          status: true,
          title: true,
        },
      },
    },
  });

  return forms.map((form) => ({
    id: form.id,
    slug: form.slug,
    purpose: form.purpose,
    mode: form.mode,
    publishedVersionId: form.publishedVersionId,
    updatedAt: form.updatedAt,
    latestVersion: form.versions[0] ?? null,
  }));
}

export default async function AdminFormsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  let forms: AdminFormListItem[] = [];
  let loadError: string | null = null;

  try {
    forms = await loadForms(session.organization.id);
  } catch {
    loadError =
      "اتصال به پایگاه داده برقرار نشد. پس از پیکربندی PostgreSQL دوباره تلاش کنید.";
  }

  const createAction = (
    <Link
      href="/admin/forms/new"
      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      ساخت فرم جدید
    </Link>
  );

  return (
    <>
      <AdminPageHeader
        title="فرم‌ساز"
        description="ساخت و مدیریت فرم‌های ثبت‌نام، رویدادها و کلاس‌ها"
        breadcrumbs={adminBreadcrumbs.forms}
        showNotice
        compact
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          برای مدیریت پرسش‌ها وارد ویرایش‌گر هر فرم شوید. انتشار هنوز فعال نیست.
        </p>
        {createAction}
      </div>

      {loadError ? (
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          {loadError}
        </div>
      ) : (
        <AdminSection
          title="فرم‌ها"
          headingId="admin-forms-heading"
          description="فقط فرم‌های واقعی سازمان فعلی نمایش داده می‌شوند."
        >
          {forms.length === 0 ? (
            <AdminEmptyState
              title="هنوز فرمی ساخته نشده است"
              description="اولین فرم ثبت‌نام یا رویداد را بسازید و سپس پرسش‌ها را در ویرایش‌گر اضافه کنید."
              action={createAction}
            />
          ) : (
            <FormsList forms={forms} />
          )}
        </AdminSection>
      )}
    </>
  );
}
