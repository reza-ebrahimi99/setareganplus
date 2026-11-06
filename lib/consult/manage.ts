import "server-only";
import { prisma } from "@/lib/prisma";
import type { ConsultMode } from "./constants";
import { loadCalendars } from "./availability";
import { queueAndSend } from "./notify";
import { nextSeat, slotsAtInstant } from "./schedule";
import { getConsultSettings } from "./settings";
import { tehranDateKey } from "./time";

class ManageError extends Error {}

export async function confirmConsultation(id: string) {
  const row = await prisma.consultation.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "نوبت پیدا نشد." };
  if (row.status === "CANCELLED") return { ok: false as const, error: "نوبت لغوشده را نمی‌توان تأیید کرد." };
  if (row.status === "PENDING") await prisma.consultation.update({ where: { id }, data: { status: "CONFIRMED" } });
  return { ok: true as const };
}

export async function cancelConsultation(id: string, reason: string | null, notify: boolean) {
  const row = await prisma.consultation.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "نوبت پیدا نشد." };
  if (row.status === "CANCELLED") return { ok: true as const };
  await prisma.$transaction(async (tx) => {
    await tx.consultationSeat.deleteMany({ where: { consultationId: id } });
    await tx.consultation.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason?.slice(0, 200) || null },
    });
  });
  if (notify) await queueAndSend(id, "CANCELLED").catch((e) => console.error("[consult] cancel sms", e));
  return { ok: true as const };
}

export async function rescheduleConsultation(id: string, startsAtIso: string, consultantId: string, mode: ConsultMode, notify: boolean) {
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return { ok: false as const, error: "زمان تازه نامعتبر است." };
  if (mode !== "ONLINE" && mode !== "IN_PERSON") return { ok: false as const, error: "شکل برگزاری نامعتبر است." };
  const settings = await getConsultSettings();
  let changed = false;
  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.consultation.findUnique({ where: { id } });
      if (!row || row.status === "CANCELLED") throw new ManageError("این نوبت دیگر باز نیست.");
      if (row.consultantId === consultantId && row.startsAt.getTime() === startsAt.getTime() && row.mode === mode) return;
      changed = true;
      const calendars = await loadCalendars(tx);
      const audience = row.audience === "SPECIAL" ? "SPECIAL" : "PUBLIC";
      const candidates = slotsAtInstant(calendars, tehranDateKey(startsAt), audience, mode, startsAt, settings.slotMinutes);
      const chosen = candidates.find((s) => s.consultantId === consultantId);
      if (!chosen) throw new ManageError("این مشاور در زمان انتخاب‌شده برنامه ندارد.");
      await tx.consultationSeat.deleteMany({ where: { consultationId: id } });
      const used = await tx.consultationSeat.findMany({ where: { consultantId, startsAt: chosen.startsAt }, select: { seat: true } });
      const seat = nextSeat(used.map((u) => u.seat), chosen.capacity);
      if (seat === null) throw new ManageError("آن ساعت پر است.");
      await tx.consultationSeat.create({ data: { consultantId, startsAt: chosen.startsAt, seat, consultationId: id } });
      await tx.consultation.update({
        where: { id },
        data: { consultantId, startsAt: chosen.startsAt, endsAt: chosen.endsAt, mode, rescheduledFrom: row.startsAt, status: row.status === "PENDING" ? "CONFIRMED" : row.status },
      });
    });
  } catch (e) {
    if (e instanceof ManageError) return { ok: false as const, error: e.message };
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") return { ok: false as const, error: "آن ساعت همین الان پر شد." };
    console.error("[consult] move", e);
    return { ok: false as const, error: "جابه‌جایی ممکن نشد." };
  }
  if (changed && notify) await queueAndSend(id, "MOVED").catch((err) => console.error("[consult] move sms", err));
  return { ok: true as const };
}
