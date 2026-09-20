import { CounselorAppointmentsHub } from "@/components/counselor-os/CounselorAppointmentsHub";
import { loadAppointmentsHub } from "@/lib/counselor-os/appointments-hub";
import { requireCounselorContext } from "@/lib/counselor-os/auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CounselorAppointmentsPage({ searchParams }: Props) {
  const ctx = await requireCounselorContext();
  const sp = await searchParams;
  const model = await loadAppointmentsHub(ctx, sp);

  return (
    <CounselorAppointmentsHub
      model={model}
      canViewMobile={ctx.canReview || ctx.isSupervisor}
      canManageAll={ctx.canReview || ctx.isSupervisor}
    />
  );
}
