import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookSkuForm } from "@/components/admin/books/BookSkuForm";
import { adminBreadcrumbs } from "@/content/admin";
import { loadCatalogTaxonomyOptions } from "@/lib/books/catalog/taxonomy-options";
import { requireBookCommerceAccess } from "@/lib/books/require";
import { createBookSkuAction } from "../actions";

export const metadata: Metadata = {
  title: "افزودن کتاب",
};
export const dynamic = "force-dynamic";

export default async function NewBookSkuPage() {
  const session = await requireBookCommerceAccess("books.catalog.manage");
  const taxonomy = await loadCatalogTaxonomyOptions(session.organization.id);

  return (
    <div>
      <AdminPageHeader
        title="افزودن کتاب جدید"
        description="کد داخلی باید در سازمان شما یکتا باشد. قیمت به‌صورت تاریخچه‌دار ذخیره می‌شود."
        breadcrumbs={[...adminBreadcrumbs.booksCatalog, { label: "افزودن کتاب" }]}
      />
      <BookSkuForm
        mode="create"
        action={createBookSkuAction}
        bookTypes={taxonomy.bookTypes}
        grades={taxonomy.grades}
        subjects={taxonomy.subjects}
        majors={taxonomy.majors}
        publishers={taxonomy.publishers}
        defaultValues={{
          title: "",
          description: "",
          keywords: "",
          publisherId: "",
          bookTypeId: "",
          gradeId: "",
          subjectId: "",
          majorId: "",
          internalCode: "",
          barcode: "",
          editionLabel: "",
          editionYear: "",
          status: "ACTIVE",
          listPriceRials: "",
          salePriceRials: "",
          tagNames: "",
        }}
      />
    </div>
  );
}
