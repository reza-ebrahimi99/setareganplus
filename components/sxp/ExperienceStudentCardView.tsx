import Image from "next/image";
import { toPersianDigits } from "@/lib/persian";
import type { ExperienceCardDto } from "@/lib/sxp/hub/load-card";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] text-white/70">{label}</dt>
      <dd className="text-xs font-medium text-white">{value}</dd>
    </div>
  );
}

type ExperienceStudentCardViewProps = {
  card: ExperienceCardDto;
};

export function ExperienceStudentCardView({ card }: ExperienceStudentCardViewProps) {
  const percent = Math.round(Math.max(0, Math.min(1, card.completionRatio)) * 100);

  return (
    <article className="sxp-rise overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] text-white shadow-[0_16px_40px_rgb(15_23_42_/_0.28)]">
      <div className="sxp-hero-cover relative h-24">
        <p className="absolute end-4 top-4 text-xs font-medium tracking-wide text-secondary">
          {card.schoolName}
        </p>
      </div>
      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-10 flex items-end gap-4">
          <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-2xl border-2 border-white/80 bg-slate-800">
            {card.portraitUrl ? (
              <Image
                src={card.portraitUrl}
                alt={card.displayName}
                fill
                unoptimized
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-semibold text-white/50">
                {card.displayName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h2 className="truncate text-lg font-bold">{card.displayName}</h2>
            <p className="mt-1 text-xs text-white/70">
              {[card.gradeName, card.branchName ?? "—", card.schoolYear]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 rounded-2xl bg-white/5 px-4 py-3">
          <Field
            label="کد دانش‌آموز"
            value={card.studentCode ? toPersianDigits(card.studentCode) : "—"}
          />
          <Field
            label="کد ملی"
            value={
              card.maskedNationalCode
                ? toPersianDigits(card.maskedNationalCode)
                : "ثبت نشده"
            }
          />
          <Field label="مدرسه" value={card.schoolName} />
          <Field label="شعبه" value={card.branchName ?? "—"} />
          <Field label="پایه" value={card.gradeName ?? "—"} />
          <Field
            label="سال تحصیلی"
            value={card.schoolYear ? toPersianDigits(card.schoolYear) : "—"}
          />
          <Field label="عضویت" value={card.membershipLabel} />
          <Field label="سطح" value={card.membershipLevelLabel} />
          <Field
            label="شناسه پرتال"
            value={toPersianDigits(card.portalId)}
          />
          <Field
            label="تکمیل پروفایل"
            value={`${toPersianDigits(percent)}٪`}
          />
        </dl>

        <div className="mt-5 flex items-center gap-4">
          <div className="rounded-2xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.qrDataUrl}
              alt={`کد هویت پرتال ${card.displayName}`}
              width={128}
              height={128}
              className="size-28"
            />
          </div>
          <p className="text-xs leading-6 text-white/70">
            کد هویت پرتال است و کد ملی نیست. فقط در فضای احرازشده مدرسه قابل استفاده است.
          </p>
        </div>
      </div>
    </article>
  );
}
