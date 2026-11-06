import { isGradeId, type Audience, type BookerRole, type ConsultMode } from "./constants";

export type DraftInput = {
  audience?: unknown;
  mode?: unknown;
  bookerRole?: unknown;
  bookerName?: unknown;
  studentName?: unknown;
  grade?: unknown;
  note?: unknown;
  startsAt?: unknown;
  consultantId?: unknown;
};

export type CleanDraft = {
  audience: Audience;
  mode: ConsultMode;
  bookerRole: BookerRole;
  bookerName: string;
  studentName: string;
  grade: string;
  note: string | null;
  startsAt: Date;
  consultantId: string;
  fastest: boolean;
};

function text(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f]/g, "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function validateDraft(input: DraftInput): { ok: true; value: CleanDraft } | { ok: false; error: string } {
  const audience = input.audience === "SPECIAL" ? "SPECIAL" : input.audience === "PUBLIC" ? "PUBLIC" : null;
  if (!audience) return { ok: false, error: "نوع مشاوره مشخص نیست." };
  const mode = input.mode === "ONLINE" || input.mode === "IN_PERSON" ? input.mode : null;
  if (!mode) return { ok: false, error: "آنلاین یا حضوری را انتخاب کنید." };
  const bookerRole = input.bookerRole === "PARENT" || input.bookerRole === "STUDENT" ? input.bookerRole : null;
  if (!bookerRole) return { ok: false, error: "بگویید این وقت برای والد است یا دانش‌آموز." };
  const studentName = text(input.studentName, 60);
  const bookerName = text(input.bookerName, 60) || (bookerRole === "STUDENT" ? studentName : "");
  if (studentName.length < 2) return { ok: false, error: "نام دانش‌آموز را کامل بنویسید." };
  if (bookerName.length < 2) return { ok: false, error: "نام خودتان را کامل بنویسید." };
  const grade = typeof input.grade === "string" ? input.grade : "";
  if (!isGradeId(grade)) return { ok: false, error: "پایه را از دوم تا کنکور انتخاب کنید." };
  const noteRaw = text(input.note, 500);
  const starts = typeof input.startsAt === "string" ? new Date(input.startsAt) : null;
  if (!starts || Number.isNaN(starts.getTime())) return { ok: false, error: "روز و ساعت را انتخاب کنید." };
  const consultantRaw = typeof input.consultantId === "string" ? input.consultantId.trim() : "";
  const fastest = consultantRaw === "fastest" || consultantRaw === "";
  if (!fastest && !/^[a-z0-9_-]{8,40}$/i.test(consultantRaw)) {
    return { ok: false, error: "مشاور را انتخاب کنید یا «سریع‌ترین مشاور آزاد» را بزنید." };
  }
  return {
    ok: true,
    value: {
      audience,
      mode,
      bookerRole,
      bookerName,
      studentName,
      grade,
      note: noteRaw || null,
      startsAt: starts,
      consultantId: fastest ? "fastest" : consultantRaw,
      fastest,
    },
  };
}
