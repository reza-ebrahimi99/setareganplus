import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CommerceProductForm } from "@/components/admin/commerce/CommerceProductForm";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  getAdminCommerceItem,
  listAdminCommerceCategories,
} from "@/lib/commerce/catalog/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "ویرایش محصول",
};

function toDatetimeLocalValue(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export default async function AdminCommerceProductEditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const session = await requirePermission("commerce.products.manage");
  const [item, categories] = await Promise.all([
    getAdminCommerceItem(session.organization.id, id),
    listAdminCommerceCategories(session.organization.id),
  ]);
  if (!item) notFound();

  return (
    <>
      <AdminPageHeader
        title={item.title}
        description="ویرایش مشخصات جزوه"
        breadcrumbs={[
          ...adminBreadcrumbs.commerceProducts,
          { label: item.title },
        ]}
        compact
      />
      <CommerceProductForm
        mode="edit"
        categories={categories}
        defaults={{
          id: item.id,
          title: item.title,
          slug: item.slug,
          shortDescription: item.shortDescription,
          description: item.description,
          authors: item.authors,
          subject: item.subject ?? "",
          gradeLabel: item.gradeLabel ?? "",
          pageCount: item.pageCount != null ? String(item.pageCount) : "",
          editionYear:
            item.editionYear != null ? String(item.editionYear) : "",
          printType: item.printType ?? "",
          bindingType: item.bindingType ?? "",
          formatSize: item.formatSize ?? "",
          featuresText: item.features.join("\n"),
          basePriceRials: String(item.basePriceRials),
          salePriceRials:
            item.salePriceRials != null ? String(item.salePriceRials) : "",
          priceStartsAt: toDatetimeLocalValue(item.priceStartsAt),
          priceEndsAt: toDatetimeLocalValue(item.priceEndsAt),
          stockQuantity: String(item.stockQuantity ?? 0),
          status: item.status,
          isVisible: item.isVisible,
          categoryId: item.categoryId ?? "",
          primaryImageAssetId: item.primaryImageAssetId,
          imageUrl: item.imageUrl,
        }}
      />
    </>
  );
}
