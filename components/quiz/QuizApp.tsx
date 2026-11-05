"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { QUESTIONS, ARCHETYPES, type Archetype, type ArchetypeKey } from "@/lib/quiz/content";
import { QUIZ_REWARD_ITEMS } from "@/lib/quiz/reward";
import { fa, prettyPhone } from "@/lib/format";
import { actionStartOtp, actionVerifyOtp, actionSubmitQuiz, actionGetArchetype } from "@/app/(site)/test-motalee/actions";
import { ShareButtons } from "@/components/site/ShareButtons";
import { Icon, Star } from "@/components/site/Star";

type Boot = {
  open: boolean;
  reason?: string;
  title: string;
  intro: string;
  rewardText: string;
  grades: string[];
  majors: string[];
  gradeHasMajorGrades: string[];
  phone?: string;
  whatsapp?: string;
  shareUrl: string;
  referral?: string;
};

type Step = "info" | "otp" | "quiz" | "result";

export function QuizApp({ boot }: { boot: Boot }) {
  const [step, setStep] = useState<Step>("info");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", grade: "", field: "", mobile: "" });
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [session, setSession] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [dir, setDir] = useState<"next" | "back">("next");
  const [result, setResult] = useState<{
    archetype: Archetype;
    rewardCode: string;
    firstName: string;
    lastName: string;
    rewardText: string;
    returning: boolean;
  } | null>(null);

  const needMajor = boot.gradeHasMajorGrades.includes(form.grade);
  const progress = step === "quiz" ? ((qIndex + 1) / QUESTIONS.length) * 100 : step === "result" ? 100 : step === "otp" ? 8 : 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function showDone(archetypeKey: string, rewardCode: string, firstName: string, lastName: string, returning: boolean) {
    start(async () => {
      const info = await actionGetArchetype(archetypeKey);
      if (!info) {
        setError("نتیجه پیدا نشد.");
        return;
      }
      setResult({
        archetype: info.archetypeInfo,
        rewardCode,
        firstName,
        lastName,
        rewardText: info.rewardText,
        returning,
      });
      setStep("result");
    });
  }

  function onStart() {
    setError("");
    start(async () => {
      const r = await actionStartOtp({ ...form, referral: boot.referral });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.alreadyDone) {
        showDone(r.alreadyDone.archetype, r.alreadyDone.rewardCode, r.alreadyDone.firstName, r.alreadyDone.lastName, true);
        return;
      }
      setOtpId(r.otpId);
      setDevCode(r.devCode);
      setCooldown(r.cooldownSec);
      setStep("otp");
    });
  }

  function onVerify() {
    setError("");
    start(async () => {
      const r = await actionVerifyOtp(otpId, otpCode);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSession(r.sessionToken);
      if (r.alreadyDone) {
        showDone(r.alreadyDone.archetype, r.alreadyDone.rewardCode, r.alreadyDone.firstName, r.alreadyDone.lastName, true);
        return;
      }
      setStep("quiz");
      setQIndex(0);
    });
  }

  function pickOption(optIndex: number) {
    const q = QUESTIONS[qIndex];
    const nextAnswers = { ...answers, [q.id]: optIndex };
    setAnswers(nextAnswers);
    setDir("next");
    if (qIndex < QUESTIONS.length - 1) {
      setTimeout(() => setQIndex((i) => i + 1), 180);
      return;
    }
    // submit
    setError("");
    start(async () => {
      const r = await actionSubmitQuiz(session, nextAnswers);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult({
        archetype: r.archetypeInfo,
        rewardCode: r.rewardCode,
        firstName: r.firstName,
        lastName: r.lastName,
        rewardText: r.rewardText,
        returning: r.returning,
      });
      setStep("result");
    });
  }

  if (!boot.open) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-8 text-center shadow-sm">
        <span className="text-4xl">🔒</span>
        <p className="mt-4 text-xl font-black text-navy">کمپین فعلاً باز نیست</p>
        <p className="mt-2 text-sm leading-7 text-muted">{boot.reason}</p>
        <Link href="/" className="btn-ghost mt-6 inline-flex px-5 py-2.5 text-sm">بازگشت به صفحهٔ اصلی</Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* progress */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-line/70" aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-l from-royal to-gold transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-gc/30 bg-gc-soft px-4 py-3 text-sm font-semibold text-gc" role="alert">
          {error}
        </div>
      )}

      {step === "info" && (
        <section className="rise rounded-3xl border border-line bg-paper p-5 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-[#ff9f43] text-2xl shadow-md">🎁</span>
            <div>
              <p className="text-sm font-bold text-gold-ink">یه هدیه ویژه داریم واست</p>
              <p className="mt-1 text-sm leading-7 text-muted">آخر تست هدیه‌ات مشخص می‌شه؛ الان سورپرایزه! 🎁</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">نام</span>
              <input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" placeholder="مثلاً سارا" />
            </label>
            <label className="block">
              <span className="label">نام خانوادگی</span>
              <input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" placeholder="مثلاً محمدی" />
            </label>
            <label className="block">
              <span className="label">پایه</span>
              <select className="input" value={form.grade} onChange={(e) => { set("grade", e.target.value); if (!boot.gradeHasMajorGrades.includes(e.target.value)) set("field", ""); }}>
                <option value="">انتخاب کنید</option>
                {boot.grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className={`block ${needMajor ? "" : "opacity-50"}`}>
              <span className="label">رشته {needMajor ? "" : "(اختیاری)"}</span>
              <select className="input" value={form.field} disabled={!needMajor} onChange={(e) => set("field", e.target.value)}>
                <option value="">انتخاب کنید</option>
                {boot.majors.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="label">شماره موبایل</span>
              <input className="input text-right" dir="ltr" inputMode="numeric" autoComplete="tel" placeholder="09xxxxxxxxx" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
              <span className="mt-1 block text-xs text-muted">کد تأیید پیامکی به این شماره ارسال می‌شود.</span>
            </label>
          </div>
          <button type="button" disabled={pending} onClick={onStart} className="btn-gold mt-6 w-full py-3.5 text-base disabled:opacity-60">
            {pending ? "در حال ارسال…" : "شروع تست و دریافت کد"}
          </button>
          <p className="mt-4 text-center text-xs leading-6 text-muted">با ادامه، با ارسال پیامک تأیید و ذخیرهٔ نتیجه برای پیگیری مشاوران ستارگان موافقت می‌کنید.</p>
        </section>
      )}

      {step === "otp" && (
        <section className="rise rounded-3xl border border-line bg-paper p-5 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="text-sm font-bold text-navy">کد تأیید را وارد کنید</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            پیامک به <span dir="ltr" className="font-semibold text-navy">{prettyPhone(form.mobile)}</span> ارسال شد.
          </p>
          {devCode && (
            <p className="mt-3 rounded-xl bg-ivory px-3 py-2 text-xs text-muted">
              حالت توسعه: کد = <b dir="ltr" className="text-navy">{devCode}</b>
            </p>
          )}
          <label className="mt-5 block">
            <span className="label">کد ۵ رقمی</span>
            <input
              className="input text-center text-2xl tracking-[0.4em] font-black"
              dir="ltr"
              inputMode="numeric"
              maxLength={5}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="·····"
              autoFocus
            />
          </label>
          <button type="button" disabled={pending || otpCode.length < 4} onClick={onVerify} className="btn-navy mt-5 w-full py-3.5 text-base disabled:opacity-60">
            {pending ? "در حال بررسی…" : "تأیید و ادامه"}
          </button>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" className="font-semibold text-royal disabled:text-muted" disabled={pending || cooldown > 0} onClick={onStart}>
              {cooldown > 0 ? `ارسال دوباره (${fa(cooldown)})` : "ارسال دوبارهٔ پیامک"}
            </button>
            <button type="button" className="text-muted hover:text-navy" onClick={() => { setStep("info"); setError(""); }}>ویرایش شماره</button>
          </div>
        </section>
      )}

      {step === "quiz" && (
        <QuestionCard
          key={QUESTIONS[qIndex].id + dir}
          index={qIndex}
          total={QUESTIONS.length}
          dir={dir}
          disabled={pending}
          onPick={pickOption}
          onBack={qIndex > 0 ? () => { setDir("back"); setQIndex((i) => i - 1); } : undefined}
        />
      )}

      {step === "result" && result && (
        <ResultView result={result} shareUrl={boot.shareUrl} phone={boot.phone} whatsapp={boot.whatsapp} />
      )}
    </div>
  );
}

function QuestionCard({
  index, total, dir, disabled, onPick, onBack,
}: {
  index: number; total: number; dir: "next" | "back"; disabled?: boolean;
  onPick: (i: number) => void; onBack?: () => void;
}) {
  const q = QUESTIONS[index];
  return (
    <section
      className={`rounded-3xl border border-line bg-paper p-5 shadow-[var(--shadow-soft)] sm:p-8 ${dir === "next" ? "quiz-anim-in" : "quiz-anim-back"}`}
    >
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-muted">
        <span>سؤال {fa(index + 1)} از {fa(total)}</span>
        {onBack && <button type="button" onClick={onBack} className="text-royal hover:underline">قبلی</button>}
      </div>
      <h2 className="text-xl font-black leading-9 text-navy sm:text-2xl">{q.text}</h2>
      <div className="mt-6 grid gap-3">
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onPick(i)}
            className="group flex items-start gap-3 rounded-2xl border border-line bg-ivory/60 px-4 py-3.5 text-right transition hover:border-royal/40 hover:bg-white hover:shadow-md disabled:opacity-60"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-line bg-paper text-xs font-black text-muted transition group-hover:border-royal group-hover:bg-royal group-hover:text-white">
              {fa(i + 1)}
            </span>
            <span className="text-[0.98rem] font-semibold leading-7 text-ink">{o.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultView({
  result, shareUrl, phone, whatsapp,
}: {
  result: { archetype: Archetype; rewardCode: string; firstName: string; lastName: string; rewardText: string; returning: boolean };
  shareUrl: string;
  phone?: string;
  whatsapp?: string;
}) {
  const a = result.archetype;
  const refUrl = useMemo(() => {
    const u = new URL(shareUrl, "https://setareganplus.ir");
    u.searchParams.set("ref", result.rewardCode);
    return u.toString();
  }, [shareUrl, result.rewardCode]);

  return (
    <section className="rise space-y-5">
      <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-[var(--shadow-lift)]">
        <div className="bg-hero relative px-5 py-8 text-white sm:px-8">
          <Star filled={false} className="pointer-events-none absolute -left-10 -top-10 size-40 text-white/10" />
          <p className="text-sm font-semibold text-gold">
            {result.returning ? "دوباره خوش آمدی" : "نتیجهٔ تست"} · {result.firstName} عزیز
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur">{a.emoji}</span>
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{a.name}</h2>
              <p className="mt-1 text-sm text-white/75">{a.tagline}</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-8">
          <p className="leading-8 text-ink/90">{a.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-800">نقطه‌قوت‌ها</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-7 text-emerald-900/80">
                {a.strengths.map((x) => <li key={x}>✓ {x}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-900">عادت‌هایی برای بهبود</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-7 text-amber-950/80">
                {a.weakHabits.map((x) => <li key={x}>• {x}</li>)}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-royal/20 bg-sky/40 p-4">
            <p className="text-sm font-black text-navy">۳–۴ توصیهٔ عملی از ستارگان</p>
            <ol className="mt-2 list-decimal space-y-2 pr-5 text-sm leading-7 text-ink/90">
              {a.tips.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>
          <p className="rounded-xl bg-ivory px-3 py-2 text-xs leading-6 text-muted">
            این یک برچسب ثابت نیست؛ فقط تصویری از الگوی فعلی مطالعه‌ات است و با تمرین می‌توانی آن را بهتر کنی.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-[#fff8e8] to-white p-5 sm:p-6">
        <p className="text-sm font-bold text-gold-ink">🎁 هدیه‌های تو</p>
        <ul className="mt-4 space-y-2.5">
          {QUIZ_REWARD_ITEMS.map((item, i) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl bg-white/80 px-3.5 py-3 text-sm font-semibold leading-7 text-navy shadow-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-black text-gold-ink">{["۱", "۲", "۳"][i]}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm font-bold text-gold-ink">کد اختصاصی تو برای هر ۳ هدیه</p>
        <p dir="ltr" className="mt-2 text-center text-3xl font-black tracking-widest text-navy">{result.rewardCode}</p>
        <p className="mt-3 text-sm leading-7 text-muted">{result.rewardText}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {phone && (
          <a href={`tel:${phone.replace(/\D/g, "")}`} className="btn-navy justify-center py-3 text-sm">
            <Icon name="phone" className="size-4" /> تماس با آموزشگاه
          </a>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener" className="btn justify-center bg-[#25D366] py-3 text-sm text-navy hover:opacity-90">
            <Icon name="chat" className="size-4" /> مشاوره واتساپ
          </a>
        )}
        <Link href="/shop" className="btn-gold justify-center py-3 text-sm">
          <Icon name="bag" className="size-4" /> فروشگاه جزوه
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="mb-3 text-sm font-bold text-navy">برای دوستانت بفرست تا آن‌ها هم تست بدهند</p>
        <ShareButtons url={refUrl} title={`${ARCHETYPES[a.key as ArchetypeKey]?.name || a.name} شدم! تو چی هستی؟ تست مطالعه ستارگان`} />
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link href="/register" className="font-bold text-royal hover:underline">پیش‌ثبت‌نام کلاس و مشاوره</Link>
        <span className="text-muted">·</span>
        <Link href="/contact" className="font-bold text-royal hover:underline">نشانی شعبه‌ها</Link>
      </div>
    </section>
  );
}
