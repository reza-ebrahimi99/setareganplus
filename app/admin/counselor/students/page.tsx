import Link from "next/link";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorStudents } from "@/lib/counselor-os/students";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ q?: string }> };

export default async function CounselorStudentsPage({ searchParams }: Props) {
  const ctx = await requireCounselorContext();
  const params = searchParams ? await searchParams : {};
  const students = await listCounselorStudents(ctx, { q: params.q });

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>دانش‌آموزان من</h1>
          <p>جستجو بر اساس نام — حداکثر ۱۰۰ نتیجه</p>
        </div>
        <form className="cos-search" method="get">
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="جستجوی نام…"
            aria-label="جستجوی دانش‌آموز"
          />
          <button type="submit" className="cos-btn">
            جستجو
          </button>
        </form>
      </header>

      {students.length === 0 ? (
        <p className="cos-empty cos-empty--panel">
          هنوز دانش‌آموزی به شما اختصاص داده نشده است.
        </p>
      ) : (
        <div className="cos-table-wrap">
          <table className="cos-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>مرحله</th>
                <th>پیشرفت</th>
                <th>جلسه بعدی</th>
                <th>پیگیری</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.studentName}</td>
                  <td>{s.currentStepTitle ?? "—"}</td>
                  <td>
                    {s.completionPercentage != null
                      ? `${toPersianDigits(s.completionPercentage)}٪`
                      : "—"}
                  </td>
                  <td>{s.nextAppointmentLabel ?? "—"}</td>
                  <td>{toPersianDigits(s.followUpPending)}</td>
                  <td>
                    <Link
                      href={`/admin/counselor/students/${s.studentId}`}
                      className="cos-btn cos-btn--ghost"
                    >
                      پرونده
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
