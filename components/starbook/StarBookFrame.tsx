import { StarBookCatalogProvider } from "@/components/starbook/StarBookCatalogContext";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";

type StarBookFrameProps = {
  children: React.ReactNode;
  activePath?: string;
  products?: readonly Pick<PublicCommerceProduct, "id" | "slug" | "title" | "gradeLabel" | "subject">[];
  grades?: readonly string[];
  subjects?: readonly string[];
};

export function StarBookFrame({
  children,
  activePath,
  products = [],
  grades = [],
  subjects = [],
}: StarBookFrameProps) {
  return (
    <StarBookCatalogProvider value={{ products, grades, subjects }}>
      <StarBookShell activePath={activePath}>{children}</StarBookShell>
    </StarBookCatalogProvider>
  );
}
