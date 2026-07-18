import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { loadGuardianPortalDashboard } from "@/lib/portal/guardian/dashboard";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = {
  title: "پرتال والدین",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ParentPortalHomePage() {
  const context = await requireGuardianPortalAccess();
  const dashboard = await loadGuardianPortalDashboard(context);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">
          سلام، {dashboard.guardianLabel}
        </h1>
        <p className="mt-1 text-sm text-muted">
          خلاصه وضعیت تحصیلی فرزندان شما
        </p>
      </div>

      {dashboard.students.length === 0 ? (
        <PortalEmptyState
          title="فرزندی متصل نیست"
          description="هنوز هیچ دانش‌آموزی به حساب شما متصل نشده است. لطفاً با مدرسه تماس بگیرید."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {dashboard.students.map((student) => (
            <Link
              key={student.studentId}
              href={`/portal/parent/students/${student.studentId}`}
              className="admin-card block p-4 transition hover:border-secondary/40 sm:p-5"
            >
              <div className="flex items-start gap-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                  {student.portraitUrl ? (
                    <Image
                      src={student.portraitUrl}
                      alt={student.studentName}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-primary/40">
                      {student.studentName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-primary">{student.studentName}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {[student.gradeName, student.schoolYear]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-border bg-background px-2 py-2">
                      <dt className="text-muted">آخرین نمره</dt>
                      <dd className="mt-1 font-semibold text-primary">
                        {student.latestScore != null
                          ? toPersianDigits(student.latestScore)
                          : "—"}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-2 py-2">
                      <dt className="text-muted">آزمون</dt>
                      <dd className="mt-1 font-semibold text-primary">
                        {toPersianDigits(student.assessmentCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-2 py-2">
                      <dt className="text-muted">افتخار</dt>
                      <dd className="mt-1 font-semibold text-primary">
                        {toPersianDigits(student.achievementCount)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/portal/parent/students"
        className="admin-card inline-flex px-4 py-3 text-sm font-medium text-primary transition hover:border-secondary/40"
      >
        مشاهده همه فرزندان
      </Link>
    </div>
  );
}
