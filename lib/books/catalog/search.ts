/**
 * Pure denormalized search-text builder for BookSku.searchText.
 * Staff search order per architecture: exact internalCode, exact barcode,
 * then prefix/substring title. This builds the single indexed haystack.
 */
export function buildSkuSearchText(input: {
  internalCode: string;
  barcode?: string | null;
  title: string;
  editionLabel?: string | null;
  keywords?: string | null;
  publisherName?: string | null;
}): string {
  return [
    input.internalCode,
    input.barcode ?? "",
    input.title,
    input.editionLabel ?? "",
    input.keywords ?? "",
    input.publisherName ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fa")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSkuSearch(searchText: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("fa");
  if (!needle) return true;
  return searchText.includes(needle);
}
