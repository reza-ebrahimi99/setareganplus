import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";

export const metadata: Metadata = { title: { default: "پنل مدیریت", template: "%s | پنل مدیریت" }, robots: { index: false } };
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await destroySession();
  redirect("/admin/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [newCount, todoCount] = await Promise.all([prisma.submission.count({ where: { status: "NEW" } }), prisma.order.count({ where: { stage: "PAID" } })]);
  return (
    <div className="min-h-dvh bg-ivory">
      <Sidebar newCount={newCount} todoCount={todoCount} logout={logout} />
      <div className="lg:mr-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
