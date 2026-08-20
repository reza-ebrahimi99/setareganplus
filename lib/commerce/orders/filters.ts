/**
 * Parse commerce order list filters from URL search params.
 */

import {
  CommerceFulfillmentStatus,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { isCommerceOpsStage } from "@/lib/commerce/orders/ops-stage";
import type { AdminCommerceOrderListFilters } from "@/lib/commerce/orders/service";

function first(
  value: string | string[] | null | undefined,
): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export type CommerceOrderSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * RBAC branch scope for order queries.
 * `null`/`undefined` = all branches; empty array matches nothing (no leak).
 */
export function commerceAllowedBranchScope(
  allowedBranchIds?: readonly string[] | null,
): { branchId: { in: string[] } } | Record<string, never> {
  if (allowedBranchIds == null) return {};
  return { branchId: { in: [...allowedBranchIds] } };
}

export function parseAdminCommerceOrderFilters(
  params: CommerceOrderSearchParams | URLSearchParams,
): Omit<AdminCommerceOrderListFilters, "organizationId" | "allowedBranchIds" | "take"> {
  const get = (key: string) =>
    params instanceof URLSearchParams ? first(params.get(key)) : first(params[key]);

  const paymentStatus = get("paymentStatus");
  const fulfillmentStatus = get("fulfillmentStatus");
  const opsStageRaw = get("opsStage");

  return {
    q: get("q"),
    buyerName: get("buyerName"),
    buyerMobile: get("buyerMobile"),
    productQuery: get("productQuery"),
    itemId: get("itemId"),
    branchId: get("branchId"),
    paymentStatus: paymentStatus as CommerceOrderPaymentStatus | "",
    fulfillmentStatus: fulfillmentStatus as CommerceFulfillmentStatus | "",
    opsStage: isCommerceOpsStage(opsStageRaw) ? opsStageRaw : "",
    paidOnly: get("paidOnly") === "1",
    undeliveredOnly: get("undeliveredOnly") === "1",
    readyForPickup: get("ready") === "1" || get("readyForPickup") === "1",
    waitingProduction: get("waitingProduction") === "1",
    todayOnly: get("today") === "1",
    deliveredOnly: get("delivered") === "1",
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
  };
}

export function commerceOrderExportQuery(
  filters: ReturnType<typeof parseAdminCommerceOrderFilters>,
): string {
  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.buyerName) exportParams.set("buyerName", filters.buyerName);
  if (filters.buyerMobile) exportParams.set("buyerMobile", filters.buyerMobile);
  if (filters.productQuery) exportParams.set("productQuery", filters.productQuery);
  if (filters.itemId) exportParams.set("itemId", filters.itemId);
  if (filters.branchId) exportParams.set("branchId", filters.branchId);
  if (filters.paymentStatus) exportParams.set("paymentStatus", filters.paymentStatus);
  if (filters.fulfillmentStatus) {
    exportParams.set("fulfillmentStatus", filters.fulfillmentStatus);
  }
  if (filters.opsStage) exportParams.set("opsStage", filters.opsStage);
  if (filters.paidOnly) exportParams.set("paidOnly", "1");
  if (filters.undeliveredOnly) exportParams.set("undeliveredOnly", "1");
  if (filters.readyForPickup) exportParams.set("ready", "1");
  if (filters.waitingProduction) exportParams.set("waitingProduction", "1");
  if (filters.todayOnly) exportParams.set("today", "1");
  if (filters.deliveredOnly) exportParams.set("delivered", "1");
  if (filters.dateFrom) exportParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) exportParams.set("dateTo", filters.dateTo);
  const qs = exportParams.toString();
  return qs ? `?${qs}` : "";
}
