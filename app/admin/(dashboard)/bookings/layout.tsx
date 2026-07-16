import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function BookingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("booking.view_all");
  return children;
}
