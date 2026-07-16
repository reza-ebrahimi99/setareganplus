import { requirePermission } from "@/lib/auth/require-admin";

export default async function AutomationSettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("automations.manage");
  return children;
}
