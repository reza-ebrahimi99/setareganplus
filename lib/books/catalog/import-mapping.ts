// Client-safe catalog import mapping fields.
//
// These are the only import-parser exports a client component ("use client")
// needs at runtime. They are intentionally kept in a dependency-free module so
// that importing them does not pull the server-only parser (exceljs +
// node:crypto) into the client bundle. `import-parser.ts` re-exports them so
// existing server-side importers are unaffected.
export const CATALOG_IMPORT_MAPPING_FIELDS = [
  "IGNORE",
  "internalCode",
  "title",
  "publisherName",
  "bookTypeName",
  "gradeName",
  "subjectName",
  "majorName",
  "editionLabel",
  "editionYear",
  "barcode",
  "listPriceRials",
  "salePriceRials",
  "keywords",
  "tags",
] as const;

export type CatalogImportMappingField = (typeof CATALOG_IMPORT_MAPPING_FIELDS)[number];
export type CatalogImportColumnMapping = Record<string, CatalogImportMappingField>;
