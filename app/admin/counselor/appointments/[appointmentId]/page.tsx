import Link from "next/link";
import { notFound } from "next/navigation";
import { OpenSessionButton } from "@/components/counselor-os/OpenSessionButton";
import { AppointmentDetailActions } from "@/components/counselor-os/AppointmentDetailActions";
import { loadCounselorAppointmentDetail } from "@/lib/counselor-os/appointments";
import { requireCounselorContext } from "@/lib/counselor-os/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ appointmentId: string }> };

export default async function CounselorAppointmentDetailPage({ params }: Props) {
  const ctx = await requireCounselorContext();
  const { appointmentId } = await params;
  const detail = await loadCounselorAppointmentDetail(ctx, appointmentId);
  if (!detail) notFound();

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>جزئیات جلسه</h1>
          <p>{detail.studentName} · {detail.whenLabel}</p>
        </div>
        <Link href="/admin/counselor/appointments" className="cos-btn cos-btn--ghost">
          بازگشت
        </Link>
      </header>

      <section className="cos-panel">
        <dl className="cos-dl-grid">
          <div>
            <dt>دانش‌آموز</dt>
            <dd>
              <Link href={`/admin/counselor/students/${detail.studentId}`}>
                {detail.studentName}
              </Link>
            </dd>
          </div>
          <div>
            <dt>نوع جلسه</dt>
            <dd>{detail.purposeLabel}</dd>
          </div>
          <div>
            <dt>وضعیت</dt>
            <dd>{detail.statusLabel}</dd>
          </div>
          <div>
            <dt>مشاور</dt>
            <dd>{detail.counselorName}</dd>
          </div>
          <div>
            <dt>زمان</dt>
            <dd>
              {detail.weekdayLabel} · {detail.timeRangeLabel}
            </dd>
          </div>
          <div>
            <dt>کد پیگیری</dt>
            <dd>{detail.trackingCode}</dd>
          </div>
          <div>
            <dt>ثبت درخواست</dt>
            <dd>{detail.requestedAtLabel}</dd>
          </div>
        </dl>

        <div className="cos-inline-actions" style={{ marginTop: "1rem" }}>
          <Link href={`/admin/counselor/students/${detail.studentId}`} className="cos-btn">
            ورود به پرونده
          </Link>
          <Link
            href={`/admin/counselor/appointments/${detail.id}/print`}
            className="cos-btn cos-btn--ghost"
            target="_blank"
          >
            چاپ برگه جلسه
          </Link>
          <OpenSessionButton appointmentId={detail.id} sessionRecordId={detail.sessionRecordId} />
        </div>
      </section>

      <AppointmentDetailActions appointment={detail} />
    </div>
  );
}
