# 03 — Warehouse & Inventory

**Status:** v2 — location-level ledger; unlimited warehouses  
**Flag:** `bookCommerce`

[Index](./README.md) · Previous: [Domain model](./02-domain-model.md) · Next: [Catalog](./04-catalog.md)

---

## 1. Purpose

Know **where** every copy is, not merely how many exist in “the shop.”

Agencies physically operate several stock pools at once: a central room, a counter shelf, copies already promised to students, gift piles, returns, and damaged copies. Treating those as one integer is how inventory became unknown.

---

## 2. Warehouse

Unlimited warehouses per organization.

| Example | kind | Notes |
|---------|------|--------|
| Central Warehouse | CENTRAL | Main agency store |
| Agency Warehouse | AGENCY | Secondary / branch store |
| Transit | TRANSIT | System warehouse for in-flight transfers |
| Pen (virtual) | VIRTUAL_SUPPLIER | Optional qtyIncoming projection only — **never** on-hand |

Each warehouse: code, name, optional `branchId`, address, isActive, default receiving location, default sellable location.

Staff see warehouses allowed by branch membership. Central visible if `allBranches` or AgencyProfile `centralVisibleToAllCashiers`.

---

## 3. WarehouseLocation

Unlimited locations per warehouse. **Every movement includes location.**

| Example name | kind | ATP? |
|--------------|------|------|
| Receiving dock | RECEIVING | no |
| Shelf A-12 | SHELF | yes |
| Reserved Stock | RESERVED | no (already promised) |
| Gift Stock | GIFT | no (campaign) |
| Returned Stock | RETURNED | no |
| Damaged Stock | DAMAGED | no |
| Pack table | STAGING | no |

Locations have: code, barcode/QR (warehouse QR + location QR), sortOrder, isActive.

Putaway rules (AgencyProfile): GRN lands in RECEIVING; operator scans to SHELF or RESERVED.

---

## 4. Balances (projection)

Unique per `(organization, location, sku)`.

```text
qtyOnHand
qtyReservedSoft     # ATP hold that has not been moved to RESERVED location
qtyIncoming         # PO not yet received, optionally tagged to this location
qtyAvailable        # computed: onHand - reservedSoft  (sellable kinds only)

Never store qtyAvailable as the only truth; recompute in the same TX as movements.
```

Warehouse dashboard rolls up locations. SKU card shows a matrix: warehouse × location.

**Forbidden:** `BookSku.stockQuantity` as system of record. If a booklet scalar exists on a shared item table, Book ERP services must not write it.

---

## 5. Movements (truth)

Append-only journal. Required fields: organizationId, warehouseId, locationId, skuId, type, qtyDelta, qtyOnHandAfter, documentType, documentId, idempotencyKey, actorUserId?, scanSessionId?.

| type | Typical from → to |
|------|-------------------|
| PURCHASE_RECEIPT | — → RECEIVING |
| PUTAWAY | RECEIVING → SHELF |
| RESERVE_SOFT | SHELF reservedSoft++ |
| RELEASE_SOFT | reverse |
| ALLOCATE_RESERVED | SHELF → RESERVED (hard allocate) |
| PICK | SHELF/RESERVED → STAGING |
| PACK | STAGING (status on delivery) |
| SALES_ISSUE | STAGING/RESERVED → out |
| RETURN_IN | customer → RETURNED |
| DAMAGE | any → DAMAGED |
| TRANSFER_OUT / IN | location A → TRANSIT → location B |
| ADJUST_IN / OUT | posted adjustment |
| COUNT_GAIN / LOSS | posted cycle count |
| GIFT_ISSUE | GIFT → out (campaign) |

Reversal = new movement with `reversesMovementId`, never DELETE.

Concurrency: update balance with `WHERE qtyOnHand - qtyReservedSoft >= :need` (or kind-specific). If 0 rows, fail the document.

---

## 6. Transfer

Document `StockTransfer`: fromWarehouse+fromLocation → toWarehouse+toLocation.

- Same warehouse shelf-to-shelf: one-step (two movements) if AgencyProfile `instantInternalTransfer`.
- Cross warehouse: SHIPPED (out + incoming on dest TRANSIT/RECEIVING) then RECEIVED.

Scanner: [08 in this doc](#8-scanner-workflows).

---

## 7. Adjustment

Document + reason codes: OPENING_BALANCE, FOUND, DATA_ERROR, THEFT, DAMAGE, SAMPLE. Dual control: creator ≠ poster unless manager. Always a movement.

Opening stock Excel posts as adjustments into named locations (default SHELF), never a silent balance UPDATE.

---

## 8. Cycle count

Header: warehouse, optional location scope, freeze (yes/no), status DRAFT → IN_PROGRESS → REVIEW → POSTED.

Lines: sku, qtySystem (from balance at freeze), qtyCounted, variance.

Post: COUNT_* movements. Counter permission ≠ poster permission.

Scanner count: scan barcode increments counted qty.

---

## 9. Reservation vs location

Two cooperating mechanisms (both required by the agency):

| Mode | What happens | When |
|------|----------------|------|
| **Soft ATP** | `qtyReservedSoft` on sellable location | Order confirmed, stock present, not yet picked |
| **Hard allocate** | Move qty SHELF → RESERVED, `reservationId` on movement metadata | Deposit received / policy `firmOnDeposit` / pick wave |

Shortage: reservation line `qtyShort`; still counts as **demand** for replenishment ([05](./05-procurement.md)).

Expiry worker: release soft holds; hard allocated stock returns to SHELF unless policy keep-for-N-days.

---

## 10. Scanner workflows

All start a `ScanSession`. Hardware wedge scanners type into a focused field; camera is fallback.

| Session | Operator goal | Posts |
|---------|---------------|--------|
| Receiving | Confirm PO lines by scan | GRN lines |
| Putaway | Scan SKU + destination location QR | PUTAWAY |
| Picking | Scan reservation/order + SKU | PICK |
| Packing | Scan to box; print box label | pack complete |
| Delivery | Scan delivery QR / order short code | SALES_ISSUE + DeliveryNote |
| Inventory count | Scan to tick | count lines (post later) |
| Shelf transfer | Scan SKU + from/to location QR | Transfer |
| Reservation fulfillment | After GRN: scan to bind inbound copies to reservation | ALLOCATE_RESERVED |

Idempotent: same barcode twice in receiving against remaining PO qty; extra scans error, do not over-receive without override permission.

---

## 11. Warehouse QR

| Token | Opens |
|-------|--------|
| Warehouse QR | Admin warehouse dashboard (auth required) |
| Location QR | Location balance + putaway target |
| SKU QR | Book page (admin SKU; public book page only if publicStore flag) |

Print via label subsystem ([04](./04-catalog.md)).

---

## 12. Bundles in the warehouse

- `KIT_EXPLODE`: no bundle on-hand; picking explodes to component movements.
- `KIT_ASSEMBLED`: bundle SKU has its own balances; assemble document consumes components, produces bundle qty on SHELF.

---

## 13. Multi-branch

Warehouse.branchId ties to Branch. Transfers between branch warehouses are first-class. Cashiers with one branch cannot post GRN to another’s locations.

---

## 14. Performance

HTTP paths read `InventoryBalance` only. Movement history is paginated. Replenishment and analytics use snapshots/runs, not SUM of the entire journal in request scope.
