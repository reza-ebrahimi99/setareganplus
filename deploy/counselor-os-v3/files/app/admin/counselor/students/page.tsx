import Link from "next/link";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { COUNSELOR_V2_STEPS } from "@/lib/counselor-os/v2-catalog";
import { listCounselorStudents } from "@/lib/counselor-os/students";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    q?: string;
    activity?: string;
    step?: string;
    package?: string;
    finance?: string;
    grade?: string;
    track?: string;
    page?: string;
  }>;
};

export default async function CounselorStudentsPage({ searchParams }: Props) {
  const ctx = await requireCounselorContext();
  const params = searchParams ? await searchParams : {};
  const result = await listCounselorStudents(ctx, {
    q: params.q,
    activity: params.activity as "never" | "inactive" | "active" | "completed" | "followup" | undefined,
    step: params.step,
    package: params.package,
    finance: params.finance as "holland" | "guidance" | "unpaid" | "none" | undefined,
    grade: params.grade,
    track: params.track,
    page: params.page,
  });

  const keep = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") keep.set(key, value);
  }

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>دانش‌آموزان مسیر هدایت تحصیلی</h1>
          <p>
            فقط کاربران Guidance V2 — {toPersianDigits(result.total)} نفر
          </p>
        </div>
      </header>

      <form className="cos-filters" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="نام یا موبایل…"
          aria-label="جستجو"
        />
        <select name="activity" defaultValue={params.activity ?? ""}>
          <option value="">همه وضعیت‌ها</option>
          <option value="never">هرگز شروع نکرده</option>
          <option value="inactive">شروع کرده، غیرفعال</option>
          <option value="active">فعال</option>
          <option value="completed">تکمیل‌شده</option>
          <option value="followup">نیازمند پیگیری</option>
        </select>
        <select name="step" defaultValue={params.step ?? ""}>
          <option value="">همه مراحل</option>
          {COUNSELOR_V2_STEPS.map((step) => (
            <option key={step.id} value={String(step.id)}>
              {toPersianDigits(step.id)}. {step.shortTitle}
            </option>
          ))}
        </select>
        <select name="package" defaultValue={params.package ?? ""}>
          <option value="">همه بسته‌ها</option>
          <option value="START">شروع مسیر</option>
          <option value="SMART">هوشمند</option>
          <option value="SPECIALIZED">تخصصی</option>
          <option value="PREMIUM">ممتاز</option>
        </select>
        <select name="finance" defaultValue={params.finance ?? ""}>
          <option value="">همه وضعیت مالی</option>
          <option value="holland">رغبت‌سنجی پرداخت‌شده</option>
          <option value="guidance">بسته پرداخت‌شده</option>
          <option value="unpaid">بدون پرداخت</option>
        </select>
        <select name="track" defaultValue={params.track ?? ""}>
          <option value="">همه رشته‌ها</option>
          <option value="MATHEMATICS">ریاضی</option>
          <option value="EXPERIMENTAL_SCIENCES">تجربی</option>
          <option value="HUMANITIES">انسانی</option>
          <option value="ARTS">هنر</option>
          <option value="LANGUAGES">زبان</option>
        </select>
        <button type="submit" className="cos-btn cos-btn--primary">
          اعمال فیلتر
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="cos-empty cos-empty--panel">دانش‌آموزی با این فیلتر یافت نشد.</p>
      ) : (
        <>
          <div className="cos-table-wrap cos-desktop-only">
            <table className="cos-table cos-table--wide">
              <thead>
                <tr>
                  <th>دانش‌آموز</th>
                  <th>موبایل</th>
                  <th>پایه / رشته</th>
                  <th>مرحله</th>
                  <th>پیشرفت</th>
                  <th>رغبت‌سنجی</th>
                  <th>بسته</th>
                  <th>آخرین فعالیت</th>
                  <th>پیگیری</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.items.map((s) => (
                  <tr key={s.studentId}>
                    <td>{s.studentName}</td>
                    <td>{s.mobile ?? "—"}</td>
                    <td>
                      {s.gradeName ?? "—"}
                      {s.trackLabel ? ` · ${s.trackLabel}` : ""}
                    </td>
                    <td>{s.currentStepTitle ?? "—"}</td>
                    <td>
                      <span className="cos-progress">{toPersianDigits(s.completionPercentage)}٪</span>
                    </td>
                    <td>
                      <span className={s.hollandPaid ? "cos-badge cos-badge--ok" : "cos-badge"}>
                        {s.hollandPaid ? "پرداخت‌شده" : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="cos-badge">{s.packageTitle}</span>
                      <small className="cos-muted"> {s.packageStateLabel}</small>
                    </td>
                    <td>{s.lastActivityLabel ?? "—"}</td>
                    <td>
                      {s.needsFollowUp ? (
                        <span className="cos-badge cos-badge--warn">نیازمند</span>
                      ) : (
                        toPersianDigits(s.followUpPending)
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/counselor/students/${s.studentId}`} className="cos-btn cos-btn--ghost">
                        پرونده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="cos-student-cards cos-mobile-only">
            {result.items.map((s) => (
              <li key={s.studentId} className="cos-panel">
                <strong>{s.studentName}</strong>
                <p>{s.mobile ?? "بدون موبایل"}</p>
                <p>
                  {s.currentStepTitle} · {toPersianDigits(s.completionPercentage)}٪
                </p>
                <p>
                  {s.packageTitle} · {s.hollandPaid ? "رغبت‌سنجی پرداخت‌شده" : "بدون رغبت‌سنجی"}
                </p>
                <Link href={`/admin/counselor/students/${s.studentId}`} className="cos-btn cos-btn--primary">
                  پرونده
                </Link>
              </li>
            ))}
          </ul>

          {result.total > result.pageSize ? (
            <nav className="cos-pager">
              {result.page > 1 ? (
                <Link href={`?${keep.toString()}&page=${result.page - 1}`}>قبلی</Link>
              ) : null}
              <span>
                صفحه {toPersianDigits(result.page)} از{" "}
                {toPersianDigits(Math.ceil(result.total / result.pageSize))}
              </span>
              {result.page * result.pageSize < result.total ? (
                <Link href={`?${keep.toString()}&page=${result.page + 1}`}>بعدی</Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
