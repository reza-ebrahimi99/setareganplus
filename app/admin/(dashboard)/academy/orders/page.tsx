import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { formatTomanFromRials } from "@/lib/academy/money";
import { prisma } from "@/lib/prisma";

export default async function AdminAcademyOrdersPage() {
  const session = await requireAdminSession();
  assertPermission(session, "academy.view");

  const orders = await prisma.academyOrder.findMany({
    where: { organizationId: session.organization.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { firstName: true, lastName: true, mobile: true } },
      items: true,
    },
  });

  return (
    <div dir="rtl" className="space-y-6">
      <h1 className="text-2xl font-bold">سفارش‌های آکادمی</h1>
      {orders.length === 0 ? (
        <p className="text-muted">سفارشی ثبت نشده است.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted">
              <th className="py-2 text-right">شماره</th>
              <th className="py-2 text-right">مشتری</th>
              <th className="py-2 text-right">مبلغ</th>
              <th className="py-2 text-right">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td dir="ltr" className="py-2 font-mono text-xs">
                  {o.orderNumber}
                </td>
                <td>
                  {o.user.firstName} {o.user.lastName}
                  <span className="block text-xs text-muted" dir="ltr">
                    {o.user.mobile}
                  </span>
                </td>
                <td dir="ltr">{formatTomanFromRials(o.totalRials)}</td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
