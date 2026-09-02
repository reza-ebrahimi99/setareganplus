import { CounselorShell } from "@/components/counselor-os/CounselorShell";
import { requireCounselorContext } from "@/lib/counselor-os/auth";

export const dynamic = "force-dynamic";

export default async function CounselorOsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireCounselorContext();
  return (
    <CounselorShell displayName={ctx.displayName}>{children}</CounselorShell>
  );
}
