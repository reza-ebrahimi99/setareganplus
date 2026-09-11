import Link from "next/link";
import { CreateCounselorForm } from "@/components/counselor-os/CreateCounselorForm";
import { requireSupervisorContext } from "@/lib/counselor-os/auth";
import { listCounselorDirectory } from "@/lib/counselor-os/profiles";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export default async function CounselorDirectoryPage() {
  const ctx = await requireSupervisorContext();
  const rows = await listCounselorDirectory(ctx);

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>مشاوران</h1>
          <p>
            پروفایل، ظرفیت، پرونده‌های فعال و مجموع پرداخت پرونده‌های تحت پوشش —{" "}
            {toPersianDigits(rows.length)} نفر
          </p>
        </div>
      </header>

      <section className="cos-panel">
        <h2>مشاور جدید</h2>
        <p className="cos-muted">ورود با موبایل و سامانه پیامک فعلی؛ حساب جدا ساخته نمی‌شود.</p>
        <CreateCounselorForm />
      </section>

      {rows.length === 0 ? (
        <p className="cos-empty cos-empty--panel">هنوز مشاوری ثبت نشده است.</p>
      ) : (
        <ul className="cos-counselor-grid">
          {rows.map((row) => (
            <li key={row.userId} className="cos-counselor-card">
              <div className="cos-counselor-card__identity">
                {row.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.photoUrl} alt="" />
                ) : (
                  <span className="cos-avatar">{row.name.slice(0, 1)}</span>
                )}
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.title || row.specialty || "مشاور"}</p>
                  <span className={row.isActive ? "cos-badge cos-badge--ok" : "cos-badge"}>
                    {row.statusLabel}
                  </span>
                </div>
              </div>
              <dl>
                <div>
                  <dt>پرونده فعال</dt>
                  <dd>{toPersianDigits(row.capacity.activeAssigned)}</dd>
                </div>
                <div>
                  <dt>ظرفیت</dt>
                  <dd>
                    {row.capacity.unlimited
                      ? "نامحدود"
                      : toPersianDigits(row.capacity.capacity ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt>آزاد</dt>
                  <dd>
                    {row.capacity.unlimited
                      ? "نامحدود"
                      : toPersianDigits(row.capacity.remaining ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt>کل تخصیص‌ها</dt>
                  <dd>{toPersianDigits(row.totalAssigned)}</dd>
                </div>
              </dl>
              <p className="cos-counselor-card__money">
                این ماه: {row.revenue.monthTomanLabel}
                <br />
                کل: {row.revenue.totalTomanLabel}
              </p>
              <p className="cos-muted">
                پرداخت موفق: {toPersianDigits(row.revenue.successfulPaymentCount)}
              </p>
              <Link href={`/admin/counselor/counselors/${row.userId}`} className="cos-btn cos-btn--primary">
                پرونده مشاور
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
