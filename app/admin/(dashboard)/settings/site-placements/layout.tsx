import { requirePermission } from "@/lib/auth/require-admin";

export default async function SiteSettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("settings.manage");
  return children;
}
