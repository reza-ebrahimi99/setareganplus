"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { book, loadCatalog, sendCode } from "@/app/(site)/moshavere/actions";
import { GRADES, MODE_LABEL, PUBLIC_PATH, SPECIAL_PATH, WEEKDAYS, isGradeId, type Audience, type ConsultMode } from "@/lib/consult/constants";
import type { Catalog } from "@/lib/consult/catalog";
import { fa } from "@/lib/format";
import { J_MONTHS } from "@/lib/jalali";

type StudentHint = { fullName: string; grade: string | null; hasPhone: boolean; maskedPhone: string };

const STEPS = ["نوع مشاوره", "روز و ساعت", "مشاور", "تأیید"];

export function BookWizard({
  audience,
  student,
  initialMonth,
  slotMinutes,
}: {
  audience: Audience;
  student?: StudentHint | null;
  initialMonth: { jy: number; jm: number };
  slotMinutes: number;
}) {
  const trusted = audience === "SPECIAL" && !!student?.hasPhone;
  const lockedGrade = student?.grade && isGradeId(student.grade) ? student.grade : "";
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [mode, setMode] = useState<ConsultMode | null>(null);
  const [role, setRole] = useState<"PARENT" | "STUDENT">(audience === "SPECIAL" ? "STUDENT" : "PARENT");
  const [bookerName, setBookerName] = useState(student?.fullName ?? "");
  const [studentName, setStudentName] = useState(student?.fullName ?? "");
  const [grade, setGrade] = useState(lockedGrade);
  const [note, setNote] = useState("");
  const [cursor, setCursor] = useState(initialMonth);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [consultantId, setConsultantId] = useState("fastest");
  const [mobile, setMobile] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string; when: string; consultant: string; mode: string; duration: number } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!mode || step < 2) return;
    let cancel = false;
    setLoadError("");
    start(async () => {
      const res = await loadCatalog(audience, mode, cursor.jy, cursor.jm);
      if (cancel) return;
      if ("error" in res) {
        setLoadError(res.error);
        setCatalog(null);
      } else setCatalog(res);
    });
    return () => {
      cancel = true;
    };
  }, [audience, mode, cursor.jy, cursor.jm, step]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      let jm = c.jm + delta;
      let jy = c.jy;
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      const beforeStart = jy < initialMonth.jy || (jy === initialMonth.jy && jm < initialMonth.jm);
      const tooFar = jy > initialMonth.jy + 1 || (jy === initialMonth.jy + 1 && jm > initialMonth.jm + 1);
      if (beforeStart || tooFar) return c;
      return { jy, jm };
    });
    setDate("");
    setStartsAt("");
  }

  const times = date && catalog ? catalog.times[date] ?? [] : [];
  const people = (catalog?.consultants ?? []).filter((c) => c.startsAt.includes(startsAt));
  const readyNames = studentName.trim().length >= 2 && (role === "STUDENT" || bookerName.trim().length >= 2) && !!grade;

  function go(next: 1 | 2 | 3 | 4) {
    setError("");
    setStep(next);
  }

  function onBook() {
    if (!mode || !startsAt) return;
    setError("");
    start(async () => {
      const draft = {
        audience,
        mode,
        bookerRole: role,
        bookerName: role === "STUDENT" ? studentName : bookerName,
        studentName,
        grade,
        note,
        startsAt,
        consultantId,
      };
      const res = await book(draft, mobile, trusted ? undefined : otpId, trusted ? undefined : otpCode);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(res);
      setStep(5);
    });
  }

  function onSendCode() {
    setError("");
    setDevCode("");
    start(async () => {
      const res = await sendCode(audience, mobile);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOtpId(res.otpId);
      if (res.devCode) setDevCode(res.devCode);
    });
  }

  return (
    <div className="card relative overflow-hidden p-4 sm:p-8">
      <div className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-gold/20 blur-3xl" />
      <ol className="relative mb-6 grid grid-cols-4 gap-2" aria-label="مراحل رزرو">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const on = step === n || (step === 5 && n === 4);
          const doneStep = step > n;
          return (
            <li key={label} className="min-w-0">
              <div className={`mb-1 h-1.5 rounded-full ${doneStep || on ? "bg-gradient-to-l from-royal to-gold" : "bg-line"}`} />
              <p className={`truncate text-[0.72rem] font-bold sm:text-xs ${on ? "text-navy" : "text-muted"}`}>
                <span className="sr-only">{doneStep ? "انجام شد: " : on ? "مرحلهٔ فعلی: " : ""}</span>
                {fa(n)}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-lg font-black text-navy">این گفت‌وگو چطور برگزار شود؟</legend>
            <p className="mt-1 text-sm text-muted">هر دو رایگان است و حدود {fa(slotMinutes)} دقیقه زمان می‌برد.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModeCard title="آنلاین" text="از خانه، با آرامش و بدون رفت‌وآمد." pressed={mode === "ONLINE"} onClick={() => { setMode("ONLINE"); setDate(""); setStartsAt(""); }} />
              <ModeCard title="حضوری در نسیم‌شهر" text="در آموزشگاه ستارگان، روبه‌رو و بی‌شتاب." pressed={mode === "IN_PERSON"} onClick={() => { setMode("IN_PERSON"); setDate(""); setStartsAt(""); }} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-lg font-black text-navy">این وقت برای کیست؟</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["PARENT", "STUDENT"] as const).map((r) => (
                <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={choiceCls(role === r)}>
                  {r === "PARENT" ? "من والد هستم" : "من دانش‌آموز هستم"}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {role === "PARENT" && (
                <label className="block">
                  <span className="label">نام شما</span>
                  <input value={bookerName} onChange={(e) => setBookerName(e.target.value)} className="input" autoComplete="name" required />
                </label>
              )}
              <label className="block">
                <span className="label">نام دانش‌آموز</span>
                <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className="input" required readOnly={audience === "SPECIAL"} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">پایه</span>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input" disabled={!!lockedGrade}>
                  <option value="">انتخاب پایه، از دوم تا کنکور</option>
                  {GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="label">اگر خواستید، یک جمله از دغدغه‌تان (اختیاری)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="input leading-7" />
              </label>
            </div>
          </fieldset>
          <button type="button" className="btn-gold w-full sm:w-auto" disabled={!mode || !readyNames} onClick={() => go(2)}>
            دیدن روزهای آزاد
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-navy">کدام روز برایتان آرام‌تر است؟</h2>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">‹</button>
              <p className="min-w-28 text-center text-sm font-bold text-navy">{J_MONTHS[cursor.jm - 1]} {fa(cursor.jy)}</p>
              <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => shiftMonth(1)} aria-label="ماه بعد">›</button>
            </div>
          </div>
          {pending && !catalog && <p className="text-sm text-muted">در حال چیدن روزها…</p>}
          {loadError && <p role="alert" className="text-sm font-semibold text-gc">{loadError}</p>}
          {catalog?.closed && <EmptyState title="رزرو موقتاً بسته است" text="ستارگان این صفحه را بسته. کمی بعد دوباره سر بزنید یا با آموزشگاه تماس بگیرید." />}
          {catalog && !catalog.closed && !catalog.configured && (
            <EmptyState title="هنوز وقتی چیده نشده" text="زمان‌ها را خودِ ستارگان در پنل ثبت می‌کند. تا وقتی اولین بازه ذخیره نشود، هیچ روزی اینجا روشن نمی‌شود و هیچ نام یا ظرفیتی ساخته نمی‌شود." />
          )}
          {catalog && catalog.configured && !catalog.closed && (
            <>
              <div role="grid" aria-label="تقویم" className="grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAYS.map((d) => <div key={d} role="columnheader" className="pb-1 text-[0.68rem] font-bold text-muted sm:text-xs">{d}</div>)}
                {Array.from({ length: catalog.days[0]?.weekday ?? 0 }, (_, i) => <div key={`b${i}`} />)}
                {catalog.days.map((d) => {
                  const selectable = d.inHorizon && d.open > 0;
                  const on = date === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      role="gridcell"
                      disabled={!selectable}
                      aria-pressed={on}
                      aria-label={`${fa(d.jd)} ${selectable ? `${fa(d.open)} زمان آزاد` : "بدون وقت"}`}
                      onClick={() => { setDate(d.date); setStartsAt(""); setConsultantId("fastest"); }}
                      className={`min-h-11 rounded-xl text-sm font-bold ${on ? "bg-navy text-white" : selectable ? "bg-sky text-navy hover:bg-royal/15" : "text-muted/40"}`}
                    >
                      {fa(d.jd)}
                    </button>
                  );
                })}
              </div>
              {date && (
                <div className="mt-5">
                  <h3 className="mb-2 font-black text-navy">ساعت‌های آزاد</h3>
                  {times.length === 0 ? (
                    <p className="text-sm text-muted">در این روز وقتی باز نمانده.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2" role="listbox" aria-label="ساعت‌ها">
                      {times.map((t) => (
                        <button key={t.startsAt} type="button" aria-pressed={startsAt === t.startsAt} onClick={() => { setStartsAt(t.startsAt); setConsultantId("fastest"); }} className={`min-h-11 rounded-full px-4 text-sm font-bold ${startsAt === t.startsAt ? "bg-gold text-navy" : "bg-ivory text-navy ring-1 ring-line"}`}>
                          {t.label}
                          {t.open > 1 && <span className="mr-1 text-xs font-semibold text-muted"> · {fa(t.open)} جا</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {catalog.days.every((d) => d.open === 0) && (
                <p className="mt-4 text-sm leading-7 text-muted">در این ماه، داخل بازهٔ رزرو، وقت آزادی نیست. ماه بعد را ببینید یا کمی بعد دوباره سر بزنید.</p>
              )}
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => go(1)}>بازگشت</button>
            <button type="button" className="btn-gold" disabled={!startsAt} onClick={() => go(3)}>انتخاب مشاور</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-black text-navy">مشاور را خودتان انتخاب کنید، یا بگذارید سریع‌ترین جا برایتان بماند</h2>
          <p className="mt-1 text-sm leading-7 text-muted">«سریع‌ترین مشاور آزاد» یعنی مشاوری که در همین ساعت جا دارد و آن روز نوبت کمتری دارد. نام کسی که برنامه ندارد اینجا نمی‌آید.</p>
          <div className="mt-4 grid gap-3" role="radiogroup" aria-label="مشاور">
            <PersonCard
              pressed={consultantId === "fastest"}
              title="سریع‌ترین مشاور آزاد"
              text="همان ساعت، بدون معطلی برای یک نام خاص."
              onClick={() => setConsultantId("fastest")}
            />
            {people.map((p) => (
              <PersonCard
                key={p.id}
                pressed={consultantId === p.id}
                title={p.name}
                text={p.specialty || "مشاور ستارگان"}
                photo={p.photo}
                onClick={() => setConsultantId(p.id)}
              />
            ))}
            {people.length === 0 && <p className="text-sm text-muted">در این ساعت مشاوری با جای خالی پیدا نشد. به مرحلهٔ قبل برگردید.</p>}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => go(2)}>بازگشت</button>
            <button type="button" className="btn-gold" disabled={!consultantId || (consultantId !== "fastest" && !people.some((p) => p.id === consultantId))} onClick={() => go(4)}>ادامه</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-navy">{trusted ? "یک نگاه آخر، بعد ثبت" : "شماره را تأیید کنید تا نوبت به نام شما بماند"}</h2>
          <dl className="grid gap-2 rounded-2xl bg-ivory p-4 text-sm sm:grid-cols-2">
            <Row k="شکل" v={mode ? MODE_LABEL[mode] : ""} />
            <Row k="دانش‌آموز" v={audience === "SPECIAL" && student ? student.fullName : studentName} />
            <Row k="پایه" v={GRADES.find((g) => g.id === (lockedGrade || grade))?.label ?? ""} />
            <Row k="مشاور" v={consultantId === "fastest" ? "سریع‌ترین مشاور آزاد" : people.find((p) => p.id === consultantId)?.name ?? ""} />
          </dl>
          {trusted ? (
            <p className="text-sm leading-7 text-muted">
              شمارهٔ ثبت‌شده در مدرسه (<span dir="ltr">{fa(student?.maskedPhone ?? "")}</span>) همان شمارهٔ این نوبت است. پیامک جداگانه‌ای برای ورود لازم نیست.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="label">موبایل</span>
                <input value={mobile} onChange={(e) => { setMobile(e.target.value); setOtpId(""); }} inputMode="tel" autoComplete="tel" dir="ltr" className="input text-left" placeholder="09123456789" />
              </label>
              <button type="button" className="btn-navy" disabled={pending || mobile.trim().length < 10} onClick={onSendCode}>دریافت کد تأیید</button>
              {otpId && (
                <label className="block">
                  <span className="label">کد پیامک‌شده</span>
                  <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" dir="ltr" className="input text-left tracking-[0.4em]" maxLength={6} />
                </label>
              )}
              {devCode && <p className="rounded-xl bg-gold/20 px-3 py-2 text-sm text-gold-ink">حالت توسعه: کد {fa(devCode)}. روی سایت واقعی این کادر نشان داده نمی‌شود.</p>}
            </div>
          )}
          <p className="text-xs leading-6 text-muted">نوبت رایگان است و به درگاه پرداخت وصل نمی‌شود. با ثبت، یک جای واقعی برای شما کنار گذاشته می‌شود.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => go(3)}>بازگشت</button>
            <button type="button" className="btn-gold" disabled={pending || (!trusted && (otpCode.replace(/\D/g, "").length < 5 || !otpId))} onClick={onBook}>
              {pending ? "در حال ثبت…" : "ثبت نوبت رایگان"}
            </button>
          </div>
        </div>
      )}

      {step === 5 && done && (
        <div className="text-center">
          <p className="text-sm font-bold text-royal">نوبتتان ثبت شد</p>
          <h2 className="mt-2 text-2xl font-black text-navy">منتظر یک گفت‌وگوی خوب باشید</h2>
          <p className="mt-3 text-muted">{done.when} · {done.mode} · {done.consultant || "مشاور ستارگان"} · {fa(done.duration)} دقیقه</p>
          <p className="mt-5 text-sm text-muted">کد پیگیری</p>
          <p dir="ltr" className="text-3xl font-black tracking-[0.2em] text-navy">{done.code}</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted">این جلسه رایگان است. اگر لازم شد زمان عوض شود، همین کد را به آموزشگاه بگویید. پیامک ثبت، اگر قالبش در پنل آماده باشد، به همین شماره می‌رود.</p>
          <Link href={audience === "SPECIAL" ? SPECIAL_PATH : PUBLIC_PATH} className="btn-ghost mt-6">بازگشت</Link>
        </div>
      )}
    </div>
  );
}

function ModeCard({ title, text, pressed, onClick }: { title: string; text: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`rounded-3xl border p-4 text-right transition ${pressed ? "border-royal bg-sky shadow-[var(--shadow-soft)]" : "border-line bg-paper hover:border-royal/30"}`}>
      <span className="block text-base font-black text-navy">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-muted">{text}</span>
    </button>
  );
}

function PersonCard({ title, text, photo, pressed, onClick }: { title: string; text: string; photo?: string | null; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={pressed} onClick={onClick} className={`flex items-center gap-3 rounded-3xl border p-3 text-right ${pressed ? "border-gold bg-gold/10" : "border-line bg-paper"}`}>
      <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-sky">
        {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-lg font-black text-royal">{title.slice(0, 1)}</span>}
      </span>
      <span>
        <span className="block font-black text-navy">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </button>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gold/50 bg-gold/10 px-5 py-8 text-center">
      <p className="text-lg font-black text-navy">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-bold text-navy">{v}</dd>
    </div>
  );
}

function choiceCls(on: boolean) {
  return `min-h-11 rounded-2xl px-3 text-sm font-bold ${on ? "bg-navy text-white" : "bg-ivory text-navy ring-1 ring-line"}`;
}
