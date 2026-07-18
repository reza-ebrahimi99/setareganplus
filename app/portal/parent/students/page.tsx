import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { requireGuardianPortalAccess } from "@/lib/portal/auth";
import { listGuardianAuthorizedStudents } from "@/lib/portal/guardian/students";

export const metadata: Metadata = {
  title: "فرزندان",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = {
  FATHER: "پدر",
  MOTHER: "مادر",
  GUARDIAN: "ولی",
  OTHER: "سایر",
};

export default async function ParentStudentsPage() {
  const context = await requireGuardianPortalAccess();
  const students = listGuardianAuthorizedStudents(context);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">فرزندان</h1>
        <p className="mt-1 text-sm text-muted">
          دانش‌آموزانی که به حساب شما متصل هستند
        </p>
      </div>

      {students.length === 0 ? (
        <PortalEmptyState
          title="فرزندی یافت نشد"
          description="هنوز دانش‌آموزی به حساب والدین شما متصل نشده است."
        />
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Link
              key={student.studentId}
              href={`/portal/parent/students/${student.studentId}`}
              className="admin-card flex items-center gap-4 px-4 py-4 transition hover:border-secondary/40"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                {student.portraitUrl ? (
                  <Image
                    src={student.portraitUrl}
                    alt={student.studentName}
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-primary/40">
                    {student.studentName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{student.studentName}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {[
                    student.gradeName,
                    student.schoolYear,
                    student.relationshipType
                      ? relationshipLabels[student.relationshipType]
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="text-sm text-secondary">جزئیات</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
