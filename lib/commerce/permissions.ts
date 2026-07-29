/**
 * Commerce RBAC permission constants.
 * Permission keys use «products» for admin UX; domain entity is CommerceItem.
 */

export const COMMERCE_PERMISSIONS = {
  view: "commerce.view",
  manage: "commerce.manage",
  categoriesManage: "commerce.categories.manage",
  productsManage: "commerce.products.manage",
  ordersView: "commerce.orders.view",
  ordersManage: "commerce.orders.manage",
  paymentsView: "commerce.payments.view",
  reportsView: "commerce.reports.view",
} as const;

export type CommercePermission =
  (typeof COMMERCE_PERMISSIONS)[keyof typeof COMMERCE_PERMISSIONS];
