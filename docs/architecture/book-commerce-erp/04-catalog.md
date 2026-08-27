# 04 — Catalog, Prices, Bundles, Labels, Excel Import

**Status:** v2  
**Flag:** `bookCommerce`

[Index](./README.md) · Previous: [Warehouse](./03-warehouse.md) · Next: [Procurement](./05-procurement.md)

---

## 1. Catalog is master data, not stock

A book remains a book when quantity is zero. Active/Inactive is a catalog flag. Stock lives only in the warehouse ledger.

Current agency columns map as:

| Today | Entity.field |
|-------|----------------|
| Internal code | BookSku.internalCode (unique per org) |
| Barcode | BarcodeSymbol + BookSku.barcode (canonical) |
| Title | BookTitle.title (+ SKU display override) |
| Group / Major | BookGroup / BookMajor |
| Price | BookSkuPrice (temporal) — **not** a mutable column |
| Publisher | Publisher |
| Edition | BookSku.editionLabel / editionYear |
| Active | BookSku.status |

---

## 2. Identity & search

- Staff search: exact internalCode, exact barcode, then prefix title (trigram later).
- Scanner always exact barcode / internal code.
- Inactive SKUs hidden from new orders; visible on history.

---

## 3. Price history (non-negotiable)

Book prices change every year. **Never overwrite.**

```text
BookSkuPrice
  skuId | bundleId
  kind: LIST | SALE | BUNDLE_FIXED
  amountRials
  effectiveFrom   (UTC)
  effectiveTo     (null = current/open)
  createdBy, reason
```

**Current price:** unique covering row at `now()`.  
**Historical:** `effectiveTo < now`.  
**Future:** `effectiveFrom > now` (pre-loaded next academic year).

Order lines **snapshot** `unitPriceRials` + `priceRowId`. Campaigns apply on top as discount rows, also snapshotted.

Import of a new price: close previous LIST row and insert. Dry-run shows “price change” not “silent mutate.”

---

## 4. Bundles

Examples: Medical Pack, Engineering Pack, Gift Pack, Summer Pack, Back to School Pack.

```text
Bundle
  code, title, status, cover
  pricingMode: FIXED | SUM_COMPONENTS | SUM_MINUS_PERCENT
  stockMode: KIT_EXPLODE | KIT_ASSEMBLED
BundleComponent
  skuId, qty, optional component discount
```

ATP explode: `floor(min(available(component)/qty))`.  
Order: one bundle line + exploded component snapshots for warehouse.  
Commission/analytics: attribute GMV to bundle and optionally roll down to components (config).

Gift packs often `stockMode=KIT_ASSEMBLED` after a packing wave from GIFT location.

---

## 5. Barcode & QR on the SKU

Every SKU supports:

| Artifact | Use |
|----------|-----|
| Publisher barcode (EAN/ISBN) | Receive / sell scan |
| Internal barcode | If publisher code missing; generated Code128 of internalCode |
| Permanent QR | Opens **book page** (admin SKU always; public page later) |
| Shelf label | Location + SKU + barcode |
| Price label | Title + current price + Jalali effective date |
| Batch label | GRN / inbound lot (optional `lotCode` on movement metadata; full WMS lots are phase-2) |
| Box label | Pack session / delivery carton |

### 5.1 Printing subsystem

`LabelTemplate` per org (size, ZPL or PDF/HTML print CSS).  
`PrintJob`: template, ids[], copies, requestedBy, status.

Admin actions: print 1 SKU, print pick list, print all shelf labels for a location, print price labels for SKUs whose price `effectiveFrom` is today.

QR payload: `https://{host}/q/{token}` — stable token, not the title slug (titles change). Public resolver respects `bookCommerce.publicStore`; otherwise redirects to admin login with `next=`.

### 5.2 Other QR namespaces

| Namespace | Destination |
|-----------|-------------|
| BOOK_SKU | Book page |
| ADMIN_DOC | Authenticated document (PO, GRN, invoice) |
| WAREHOUSE / LOCATION | Warehouse UI |
| PARTNER_REFERRAL | `/r/{token}` campaign |
| ORDER / DELIVERY | Tracking / pickup |

Do not reuse booklet `qrToken` format; prefix `ba_`.

---

## 6. Excel import engine (enterprise)

Target: **1000+ books** per job, staff-operated, reversible via report (compensating actions), never eval formulas.

### 6.1 Flow

```text
Upload .xlsx
  → parse values only (exceljs, formula-stripped)
  → Preview (first N rows + column mapping)
  → Validation (types, required, Persian/Latin digits, price ≥ 0)
  → Duplicate detection
        match key order: internalCode → barcode → isbn
        result: EXACT_EXISTING | CONFLICT (same code different title) | NEW
  → Operator chooses: Update existing / Insert new / Skip conflicts
  → Commit worker (chunks, transactional per chunk)
  → Error report (row-level)
  → Import report (counts, downloadable xlsx)
```

Statuses: UPLOADED, PREVIEWED, VALIDATED, COMMITTING, DONE, FAILED, CANCELLED.

Dry-run is mandatory before first catalog cutover; optional checkbox later.

### 6.2 Job types

| jobType | Updates |
|---------|---------|
| CATALOG | Publisher, group, major, title, SKU, **new price rows**, barcode |
| OPENING_STOCK | Adjustments into a chosen warehouse+location |
| OPEN_ORDERS | Optional; default **off** (paper leftovers) |
| PARTNERS | Teachers/schools |
| PRICE_LIST | Price history only |

### 6.3 Duplicate & update rules (catalog)

- Same internalCode: update mutable descriptive fields (title, group); **price** goes through history insert if amount changed.
- Barcode belongs to another SKU: ERROR, never steal.
- Empty barcode: allowed.
- Unknown group/major/publisher: auto-create if `createMissingTaxonomies` else ERROR.

### 6.4 Performance

- Parse on worker, not in the browser beyond a tiny preview sample if needed.
- Chunk 100–200 SKUs per transaction.
- Progress on job row (`processedRows`).
- 1k–10k rows in scope; no 100k Excel in v1 without streaming follow-up.

### 6.5 Security

- Sanitize export cells (`= + - @`).
- Store files under `STAROS_MEDIA_ROOT`, not git.
- `DATA_EXPORTED` / import actor on AuditLog.
- Permission `books.import`.

### 6.6 Reports

Import report: created, updated, skipped, invalid, failed, duplicate, priceChanges.  
Error report: row number, column, code, Persian message, raw value.  
Staff can re-upload a fixed file as a new job (checksum shows duplicates of the file itself).

---

## 7. Excel export

Catalog, price list (current + history), stock matrix (warehouse × location), labels CSV for external printers. Same sanitizer.

---

## 8. Admin UX

- Spreadsheet-like SKU table with sticky internal code column.
- Price drawer: timeline, not a single input that feels like overwrite (UI shows “new price from date”).
- Bundle builder: add components, see exploded ATP live (from balances).
- Label print queue.
