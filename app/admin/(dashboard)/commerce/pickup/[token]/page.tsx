import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PickupDeskSearch } from "@/components/admin/commerce/PickupDeskSearch";
import { PickupOrderPanel } from "@/components/admin/commerce/PickupOrderPanel";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { resolveCommercePickupScan } from "@/lib/commerce/orders/pickup";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { listCommerceHandoverStaff } from "@/lib/commerce/orders/staff";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دریافت سفارش",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CommercePickupTokenPage({ params }: PageProps) {
  const session = await requirePermission("commerce.orders.view");
  const { token: rawToken } = await params;
  const token = parseCommerceOrderQrInput(decodeURIComponent(rawToken)) ?? decodeURIComponent(rawToken);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;
  const scanned = await resolveCommercePickupScan({
    organizationId: session.organization.id,
    token,
    allowedBranchIds,
  });
  const canManage = hasPermission(session, "commerce.orders.manage");
  const canChangeStaff = session.membership.allBranches;
  const staff = await listCommerceHandoverStaff(session.organization.id);
  const staffWithSelf = staff.some((member) => member.id === session.user.id)
    ? staff
    : [{ id: session.user.id, name: session.user.displayName || "کارمند" }, ...staff];

  if (scanned.status === "not_found") {
    return (
      <>
        <AdminPageHeader
          title="میز دریافت"
          description="کد QR یافت نشد"
          breadcrumbs={adminBreadcrumbs.commercePickup}
          compact
        />
        <AdminEmptyState
          title="سفارشی با این QR نیست"
          description="کد را دوباره اسکن کنید یا شناسه را وارد کنید."
        />
        <div className="mt-6">
          <PickupDeskSearch initialQuery={token} />
        </div>
      </>
    );
  }

  if (scanned.status === "wrong_branch") {
    return (
      <>
        <AdminPageHeader
          title="میز دریافت"
          description="شعبه نامعتبر"
          breadcrumbs={adminBreadcrumbs.commercePickup}
          compact
        />
        <div className="rounded-3xl border-2 border-red-500 bg-red-50 px-5 py-8 text-center text-red-950">
          <p className="text-2xl font-bold">این سفارش مربوط به شعبه دیگری است.</p>
          <p className="mt-3 text-sm" dir="ltr">
            {toPersianDigits(scanned.orderNumber)}
          </p>
          {scanned.destination ? (
            <div className="mt-4 text-base">
              <p className="font-semibold">{scanned.destination.name}</p>
              {scanned.destination.address ? (
                <p className="mt-1 text-sm">{scanned.destination.address}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-6">
          <PickupDeskSearch />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="میز دریافت"
        description={`${scanned.order.buyerName ?? "سفارش"} · ${toPersianDigits(scanned.order.orderNumber)}`}
        breadcrumbs={adminBreadcrumbs.commercePickup}
        compact
      />
      <PickupOrderPanel
        order={scanned.order}
        canManage={canManage}
        canChangeStaff={canChangeStaff}
        defaultHandoverStaffUserId={session.user.id}
        staff={staffWithSelf}
      />
    </>
  );
}
