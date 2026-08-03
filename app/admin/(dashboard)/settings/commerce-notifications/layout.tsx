import { requirePermission } from "@/lib/auth/require-admin";

export default async function CommerceNotificationsSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("commerce.orders.manage");
  return children;
}
