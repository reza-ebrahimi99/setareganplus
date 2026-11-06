import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SRC_COOKIE, readAttribution } from "@/lib/analytics/classify";
import { fa, jalaliDate, normalizeIranMobile } from "@/lib/format";
import { loadCalendars } from "./availability";
import { generatePublicCode } from "./access";
import { isGradeId, MODE_LABEL, type PhoneProof } from "./constants";
import { queueAndSend } from "./notify";
import { assertOtpVerified, consumeOtp } from "./otp";
import { nextSeat, pickFastestConsultant, slotsAtInstant, type SlotDraft } from "./schedule";
import { getConsultSettings } from "./settings";
import { getStudentSession } from "./students";
import { addTehranDays, tehranDateKey, tehranDateKeys, tehranDayStart, tehranHm } from "./time";
import { validateDraft, type DraftInput } from "./validate";

class BookError extends Error {}

function isUnique(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

async function attribution(): Promise<{ source: string; medium: string; campaign: string }> {
  try {
    const key = process.env.SESSION_SECRET;
    if (!key || key.length < 32) return { source: "", medium: "", campaign: "" };
    const raw = (await cookies()).get(SRC_COOKIE)?.value;
    const a = readAttribution(key, raw);
    if (!a) return { source: "", medium: "", campaign: "" };
    return { source: a.s.slice(0, 32), medium: a.m.slice(0, 40), campaign: a.c.slice(0, 40) };
  } catch {
    return { source: "", medium: "", campaign: "" };
  }
}

export async function createConsultation(input: { draft: DraftInput; mobile?: string; otpId?: string; otpCode?: string }): Promise<
  { ok: true; code: string; when: string; consultant: string; mode: string; duration: number } | { ok: false; error: string }
> {
  const parsed = validateDraft(input.draft);
  if (!parsed.ok) return parsed;
  const value = { ...parsed.value };
  const settings = await getConsultSettings();
  if (value.audience === "PUBLIC" && !settings.publicOpen) return { ok: false, error: "رزرو مشاورهٔ عمومی موقتاً بسته است." };
  if (value.audience === "SPECIAL" && !settings.specialOpen) return { ok: false, error: "رزرو جلسهٔ ویژه موقتاً بسته است." };
  if (value.startsAt.getTime() < Date.now() + settings.minNoticeMinutes * 60_000) {
    return { ok: false, error: "این ساعت دیگر قابل رزرو نیست. یک زمان دیرتر را انتخاب کنید." };
  }

  let mobile = "";
  let proof: PhoneProof = "SMS";
  let studentId: string | null = null;
  if (value.audience === "SPECIAL") {
    const session = await getStudentSession();
    if (!session) return { ok: false, error: "اول با کد دانش‌آموزی وارد شوید." };
    studentId = session.id;
    value.studentName = session.fullName;
    if (session.grade && isGradeId(session.grade)) value.grade = session.grade;
    if (session.mobile) {
      mobile = session.mobile;
      proof = "ACCESS_CODE";
    } else {
      const typed = normalizeIranMobile(input.mobile ?? "");
      if (!typed) return { ok: false, error: "برای این دانش‌آموز شمارهٔ مدرسه ثبت نشده. شماره را وارد کنید تا با پیامک تأیید شود." };
      mobile = typed;
      proof = "SMS";
    }
  } else {
    const typed = normalizeIranMobile(input.mobile ?? "");
    if (!typed) return { ok: false, error: "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)." };
    mobile = typed;
  }
  if (proof === "SMS") {
    if (!input.otpId || !input.otpCode) return { ok: false, error: "شماره را با پیامک تأیید کنید." };
    const checked = await assertOtpVerified(input.otpId, input.otpCode, mobile);
    if (!checked.ok) return checked;
  }

  const attr = await attribution();
  const maxUpcoming = value.audience === "SPECIAL" ? 1 : 2;
  let lastError = "این زمان تازه پر شد. ساعت دیگری را انتخاب کنید.";

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePublicCode();
    try {
      const created = await prisma.$transaction(async (tx) => {
        const upcoming = await tx.consultation.count({
          where: { mobile, audience: value.audience, status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gt: new Date() } },
        });
        if (upcoming >= maxUpcoming) throw new BookError(value.audience === "SPECIAL" ? "برای این دانش‌آموز یک جلسهٔ باز دارید. برای جابه‌جایی با آموزشگاه هماهنگ کنید." : "دو نوبت باز با این شماره ثبت شده. برای وقت تازه، یکی را با آموزشگاه لغو کنید.");

        const horizon = new Set(tehranDateKeys(new Date(), settings.horizonDays));
        if (!horizon.has(tehranDateKey(value.startsAt))) throw new BookError("این روز در بازهٔ رزرو نیست.");
        const calendars = await loadCalendars(tx);
        const candidates = slotsAtInstant(calendars, tehranDateKey(value.startsAt), value.audience, value.mode, value.startsAt, settings.slotMinutes).filter((s) => s.startsAt.getTime() >= Date.now() + settings.minNoticeMinutes * 60_000);
        if (candidates.length === 0) throw new BookError("این ساعت در برنامهٔ مشاوران نیست.");
        const seats = await tx.consultationSeat.findMany({
          where: { startsAt: value.startsAt, consultantId: { in: candidates.map((s) => s.consultantId) } },
          select: { consultantId: true },
        });
        const usedCount = new Map<string, number>();
        for (const seat of seats) usedCount.set(seat.consultantId, (usedCount.get(seat.consultantId) ?? 0) + 1);
        const open = candidates.filter((s) => (usedCount.get(s.consultantId) ?? 0) < s.capacity);
        if (open.length === 0) throw new BookError("این ساعت همین الان پر شد. یک زمان دیگر را انتخاب کنید.");

        const date = tehranDateKey(value.startsAt);
        const dayStart = tehranDayStart(date);
        const dayEnd = tehranDayStart(addTehranDays(date, 1));
        const loads = await tx.consultation.groupBy({
          by: ["consultantId"],
          where: { status: { in: ["PENDING", "CONFIRMED"] }, startsAt: { gte: dayStart, lt: dayEnd } },
          _count: { _all: true },
        });
        const loadOf = new Map(loads.map((l) => [l.consultantId, l._count._all]));
        let chosen: SlotDraft | undefined;
        if (value.fastest) {
          const id = pickFastestConsultant(open.map((s) => ({ id: s.consultantId, sortOrder: calendars.find((c) => c.id === s.consultantId)?.sortOrder ?? 0, dayLoad: loadOf.get(s.consultantId) ?? 0 })));
          chosen = open.find((s) => s.consultantId === id);
        } else {
          chosen = open.find((s) => s.consultantId === value.consultantId);
        }
        if (!chosen) throw new BookError("این مشاور در ساعت انتخاب‌شده جا ندارد. مشاور دیگری یا «سریع‌ترین» را انتخاب کنید.");

        const used = await tx.consultationSeat.findMany({ where: { consultantId: chosen.consultantId, startsAt: chosen.startsAt }, select: { seat: true } });
        const seat = nextSeat(used.map((u) => u.seat), chosen.capacity);
        if (seat === null) throw new BookError("این ساعت همین الان پر شد. یک زمان دیگر را انتخاب کنید.");

        const row = await tx.consultation.create({
          data: {
            code,
            audience: value.audience,
            mode: value.mode,
            status: "PENDING",
            consultantId: chosen.consultantId,
            startsAt: chosen.startsAt,
            endsAt: chosen.endsAt,
            bookerName: value.bookerName,
            bookerRole: value.bookerRole,
            studentName: value.studentName,
            grade: value.grade,
            mobile,
            phoneProof: proof,
            note: value.note,
            studentId,
            source: attr.source,
            medium: attr.medium,
            campaign: attr.campaign,
          },
        });
        await tx.consultationSeat.create({ data: { consultantId: chosen.consultantId, startsAt: chosen.startsAt, seat, consultationId: row.id } });
        if (proof === "SMS" && input.otpId) {
          const consumed = await consumeOtp(tx, input.otpId, mobile);
          if (!consumed) throw new BookError("این کد تأیید دیگر قابل استفاده نیست؛ دوباره پیامک بگیرید.");
        }
        const consultant = calendars.find((c) => c.id === chosen!.consultantId);
        return { id: row.id, code: row.code, consultant: consultant ? (await tx.consultant.findUnique({ where: { id: consultant.id }, select: { name: true } }))?.name ?? "" : "" };
      });
      await queueAndSend(created.id, "CREATED").catch((e) => console.error("[consult] notify", e));
      const when = `${jalaliDate(value.startsAt)} ساعت ${fa(tehranHm(value.startsAt))}`;
      return { ok: true, code: created.code, when, consultant: created.consultant, mode: MODE_LABEL[value.mode], duration: settings.slotMinutes };
    } catch (e) {
      if (e instanceof BookError) return { ok: false, error: e.message };
      if (isUnique(e)) {
        lastError = "این ساعت همین الان پر شد. یک زمان دیگر را انتخاب کنید.";
        continue;
      }
      console.error("[consult] book", e);
      return { ok: false, error: "ثبت نوبت ممکن نشد. دوباره تلاش کنید." };
    }
  }
  return { ok: false, error: lastError };
}

export type Tx = Prisma.TransactionClient;
