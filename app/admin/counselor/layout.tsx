import { CounselorShell } from "@/components/counselor-os/CounselorShell";
import { countPendingCounselorConfirmations } from "@/lib/counselor-os/appointment-lifecycle";
import { requireCounselorContext } from "@/lib/counselor-os/auth";

export const dynamic = "force-dynamic";

export default async function CounselorOsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireCounselorContext();
  const pendingAppointments = await countPendingCounselorConfirmations({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  return (
    <CounselorShell
      displayName={ctx.displayName}
      roleLabel={ctx.roleLabel}
      isSupervisor={ctx.isSupervisor}
      pendingAppointments={pendingAppointments}
    >
      {children}
    </CounselorShell>
  );
}
