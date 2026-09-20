import { notFound } from "next/navigation";
import { SessionWorksheetDocument } from "@/components/counselor-os/SessionWorksheetDocument";
import { loadCounselorAppointmentDetail } from "@/lib/counselor-os/appointments";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ appointmentId: string }> };

export default async function AppointmentPrintPage({ params }: Props) {
  const ctx = await requireCounselorContext();
  const { appointmentId } = await params;
  const detail = await loadCounselorAppointmentDetail(ctx, appointmentId);
  if (!detail) notFound();

  const startsAt = new Date(detail.startsAtIso);
  const endsAt = new Date(detail.endsAtIso);
  const dateLabel = formatJalaliDateTimeShort(startsAt).split("،")[0] ?? "";
  const timeLabel = `${toPersianDigits(formatTehranTime24(startsAt))}–${toPersianDigits(formatTehranTime24(endsAt))}`;

  return (
    <SessionWorksheetDocument
      studentName={detail.studentName}
      counselorName={detail.counselorName}
      sessionLabel={detail.purposeLabel}
      dateLabel={dateLabel}
      timeLabel={timeLabel}
      trackingCode={detail.trackingCode}
      generatedAtIso={new Date().toISOString()}
      appointmentId={detail.id}
    />
  );
}
