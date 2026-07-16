import { requirePermission } from "@/lib/auth/require-admin";

export default async function CommunicationSettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("communication.manage");
  return children;
}
