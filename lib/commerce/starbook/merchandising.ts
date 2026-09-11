import {
  listPublicCommerceFilters,
  listPublicCommerceProducts,
  listPublicStoreCollections,
} from "@/lib/commerce/catalog/service";
import { partitionStarBookShelves } from "@/lib/commerce/starbook/shelves";

export {
  partitionStarBookShelves,
  recommendStarBookProducts,
  relatedStarBookProducts,
} from "@/lib/commerce/starbook/shelves";

export async function loadStarBookHome(organizationId: string) {
  const [products, filters, collections] = await Promise.all([
    listPublicCommerceProducts({ organizationId, limit: 80 }),
    listPublicCommerceFilters(organizationId),
    listPublicStoreCollections(organizationId),
  ]);
  return {
    products,
    filters,
    collections,
    shelves: partitionStarBookShelves(products),
  };
}
