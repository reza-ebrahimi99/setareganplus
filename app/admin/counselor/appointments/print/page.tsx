import { loadAppointmentsHub } from "@/lib/counselor-os/appointments-hub";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AppointmentsSchedulePrintPage({ searchParams }: Props) {
  const ctx = await requireCounselorContext();
  const sp = await searchParams;
  const model = await loadAppointmentsHub(ctx, sp);

  return (
    <div className="counselor-report counselor-schedule-print" dir="rtl">
      <h1>برنامه جلسات مشاوره</h1>
      <p>
        {model.weekdayLabel} · {model.dateLabel}
      </p>
      <table className="counselor-report__table">
        <thead>
          <tr>
            <th>ساعت</th>
            <th>دانش‌آموز</th>
            <th>نوع</th>
            <th>وضعیت</th>
            <th>حضور</th>
            <th>یادداشت</th>
          </tr>
        </thead>
        <tbody>
          {model.timelineBlocks
            .filter((b) => b.kind !== "gap" && b.kind !== "break")
            .map((b) => (
              <tr key={b.id}>
                <td>{toPersianDigits(`${b.startLabel}–${b.endLabel}`)}</td>
                <td>{b.title}</td>
                <td>{b.subtitle}</td>
                <td>{b.statusLabel}</td>
                <td />
                <td />
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
