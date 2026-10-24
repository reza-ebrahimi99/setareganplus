import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin, destroySession, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_PERMS } from "@/lib/perms";
import { Sidebar } from "@/components/admin/Sidebar";

export const metadata: Metadata = { title: { default: "پنل مدیریت", template: "%s | پنل مدیریت" }, robots: { index: false } };
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await destroySession();
  redirect("/admin/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const [newCount, todoCount] = await Promise.all([
    can(me, "submissions") ? prisma.submission.count({ where: { status: "NEW" } }) : 0,
    can(me, "shop.orders.view") ? prisma.order.count({ where: { stage: "PAID" } }) : 0,
  ]);
  const perms = me.owner ? ALL_PERMS : [...me.perms];
  return (
    <div className="min-h-dvh bg-ivory">
      <Sidebar newCount={newCount} todoCount={todoCount} logout={logout} perms={perms} user={{ name: me.name, username: me.username, owner: me.owner }} />
      <div className="lg:mr-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
