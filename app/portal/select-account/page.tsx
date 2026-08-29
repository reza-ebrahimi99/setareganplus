import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalAccountType } from "@/generated/prisma/enums";
import { selectPortalAccountAction } from "@/app/portal/select-account/actions";
import { requirePortalContext } from "@/lib/portal/auth";

export const metadata: Metadata = {
  title: "انتخاب حساب",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const accountTypeLabel: Record<PortalAccountType, string> = {
  STUDENT: "دانش‌آموز",
  GUARDIAN: "ولی",
};

export default async function PortalSelectAccountPage() {
  const context = await requirePortalContext();

  if (context.links.length <= 1) {
    redirect("/portal");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10"
      dir="rtl"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-primary">انتخاب حساب</h1>
          <p className="mt-2 text-sm text-muted">
            چند حساب پرتال برای شما فعال است. یکی را انتخاب کنید.
          </p>
        </div>
        <div className="space-y-3">
          {context.links.map((link) => (
            <form key={link.id} action={selectPortalAccountAction}>
              <input type="hidden" name="linkId" value={link.id} />
              <button
                type="submit"
                className="admin-card flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition hover:border-secondary/40"
              >
                <div>
                  <p className="font-semibold text-primary">{link.label}</p>
                  <p className="mt-1 text-sm text-muted">
                    {accountTypeLabel[link.accountType]}
                  </p>
                </div>
                <span className="text-sm text-secondary">انتخاب</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
