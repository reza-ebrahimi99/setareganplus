import Link from "next/link";
import { AcademyOrderStatus } from "@/generated/prisma/enums";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { formatTomanFromRials } from "@/lib/academy/money";
import { prisma } from "@/lib/prisma";

export default async function AdminAcademyDashboardPage() {
  const session = await requireAdminSession();
  assertPermission(session, "academy.view");
  const orgId = session.organization.id;

  const activePlaybackSince = new Date();
  activePlaybackSince.setSeconds(activePlaybackSince.getSeconds() - 120);

  const [paidOrders, revenue, courses, students, sessions] = await Promise.all([
    prisma.academyOrder.count({
      where: { organizationId: orgId, status: AcademyOrderStatus.PAID },
    }),
    prisma.academyOrder.aggregate({
      where: { organizationId: orgId, status: AcademyOrderStatus.PAID },
      _sum: { totalRials: true },
    }),
    prisma.academyCourse.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.academyContentEntitlement.groupBy({
      by: ["userId"],
      where: { organizationId: orgId, revokedAt: null },
    }),
    prisma.academyPlaybackSession.count({
      where: {
        organizationId: orgId,
        revokedAt: null,
        endedAt: null,
        lastHeartbeatAt: { gte: activePlaybackSince },
      },
    }),
  ]);

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">آکادمی ستارگان</h1>
        <p className="mt-1 text-sm text-muted">داشبورد عملیات و فروش</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-surface p-4">
          <p className="text-xs text-muted">درآمد تأییدشده</p>
          <p className="mt-2 text-lg font-bold" dir="ltr">
            {formatTomanFromRials(revenue._sum.totalRials ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-surface p-4">
          <p className="text-xs text-muted">سفارش پرداخت‌شده</p>
          <p className="mt-2 text-lg font-bold">{paidOrders}</p>
        </div>
        <div className="rounded-xl border bg-surface p-4">
          <p className="text-xs text-muted">دوره‌ها</p>
          <p className="mt-2 text-lg font-bold">{courses}</p>
        </div>
        <div className="rounded-xl border bg-surface p-4">
          <p className="text-xs text-muted">نشست پخش فعال</p>
          <p className="mt-2 text-lg font-bold">{sessions}</p>
        </div>
      </div>
      <p className="text-sm text-muted">
        دانش‌پذیران با دسترسی فعال: {students.length}
      </p>
      <Link
        href="/admin/academy/courses"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-white"
      >
        مدیریت دوره‌ها
      </Link>
    </div>
  );
}
