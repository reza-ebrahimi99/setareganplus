import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { ensureDefaultBookTypes } from "@/lib/books/agency-profile";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";
import { BookTypeRowForm, CreateBookTypeForm } from "./BookTypeForms";

export const metadata: Metadata = {
  title: "انواع کتاب",
};
export const dynamic = "force-dynamic";

export default async function BookTypesPage() {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  await ensureDefaultBookTypes(session.organization.id);

  const types = await prisma.bookType.findMany({
    where: { organizationId: session.organization.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="انواع کتاب"
        description="آینده‌نگر: نوع کتاب داده است، نه کد ثابت برنامه. هر زمان لازم بود نوع جدید اضافه کنید."
        breadcrumbs={adminBreadcrumbs.booksCatalogTypes}
      />

      <CreateBookTypeForm />

      <div className="space-y-2">
        {types.map((type) => (
          <BookTypeRowForm
            key={type.id}
            id={type.id}
            label={type.label}
            sortOrder={type.sortOrder}
            isActive={type.isActive}
            isSystem={type.isSystem}
          />
        ))}
      </div>

      <p className="text-xs text-muted">
        {toPersianDigits(types.length)} نوع کتاب ثبت شده است.
      </p>
    </div>
  );
}
