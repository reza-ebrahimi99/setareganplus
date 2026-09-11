"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicCommerceProduct } from "@/lib/commerce/catalog/service";

type CatalogValue = {
  products: readonly Pick<PublicCommerceProduct, "id" | "slug" | "title" | "gradeLabel" | "subject">[];
  grades: readonly string[];
  subjects: readonly string[];
};

const CatalogContext = createContext<CatalogValue>({
  products: [],
  grades: [],
  subjects: [],
});

export function StarBookCatalogProvider({
  value,
  children,
}: {
  value: CatalogValue;
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useStarBookCatalog() {
  return useContext(CatalogContext);
}
