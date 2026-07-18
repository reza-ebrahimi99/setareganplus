import type { Metadata } from "next";
import Image from "next/image";
import { requireStudentPortalAccess } from "@/lib/portal/auth";
import { loadPortalStudentProfile } from "@/lib/portal/student/profile";

export const metadata: Metadata = {
  title: "پروفایل",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentPortalProfilePage() {
  const context = await requireStudentPortalAccess();
  const studentId = context.authorizedStudents[0]!.studentId;
  const profile = loadPortalStudentProfile(context, studentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">پروفایل</h1>
        <p className="mt-1 text-sm text-muted">اطلاعات عمومی دانش‌آموز</p>
      </div>

      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative size-24 overflow-hidden rounded-2xl border border-border bg-background">
            {profile.portraitUrl ? (
              <Image
                src={profile.portraitUrl}
                alt={profile.studentName}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-semibold text-primary/40">
                {profile.studentName.slice(0, 1)}
              </div>
            )}
          </div>
          <dl className="w-full space-y-3 sm:flex-1">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
              <dt className="text-sm text-muted">نام</dt>
              <dd className="text-sm font-medium text-primary">
                {profile.studentName}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
              <dt className="text-sm text-muted">پایه</dt>
              <dd className="text-sm font-medium text-primary">
                {profile.gradeName}
              </dd>
            </div>
            {profile.schoolYear ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                <dt className="text-sm text-muted">سال تحصیلی</dt>
                <dd className="text-sm font-medium text-primary">
                  {profile.schoolYear}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>
    </div>
  );
}
