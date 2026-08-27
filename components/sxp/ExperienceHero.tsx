import Image from "next/image";
import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";

type ExperienceHeroProps = {
  displayName: string;
  organizationName: string;
  studentName: string | null;
  portraitUrl: string | null;
  membershipLabel: string;
  membershipLevelLabel: string;
  completionRatio: number;
  gradeName: string | null;
  schoolYear: string | null;
  branchName: string | null;
  cardHref: string;
  timelineHref: string;
  filesHref: string;
  filesEnabled: boolean;
};

export function ExperienceHero({
  displayName,
  organizationName,
  studentName,
  portraitUrl,
  membershipLabel,
  membershipLevelLabel,
  completionRatio,
  gradeName,
  schoolYear,
  branchName,
  cardHref,
  timelineHref,
  filesHref,
  filesEnabled,
}: ExperienceHeroProps) {
  const name = studentName ?? displayName;
  const percent = Math.round(Math.max(0, Math.min(1, completionRatio)) * 100);
  const chips = [organizationName, branchName, gradeName, schoolYear].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <section className="sxp-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
      <div className="sxp-hero-cover relative h-28 sm:h-36">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
      </div>
      <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-background shadow-md sm:size-24">
            {portraitUrl ? (
              <Image
                src={portraitUrl}
                alt={name}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-semibold text-primary/40">
                {name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-xs font-medium text-muted">خانه تجربه</p>
            <h1 className="truncate text-xl font-bold text-primary sm:text-2xl">
              سلام، {name}
            </h1>
          </div>
        </div>

        {chips.length > 0 ? (
          <p className="mt-3 text-sm text-muted">{chips.join(" · ")}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-primary">
            عضویت {membershipLabel}
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
            سطح {membershipLevelLabel}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span>تکمیل پروفایل</span>
            <span className="font-medium text-primary">
              {toPersianDigits(percent)}٪
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="تکمیل پروفایل"
          >
            <div
              className="h-full rounded-full bg-secondary transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link
            href={cardHref}
            className="min-h-11 rounded-xl border border-secondary/30 bg-secondary/10 px-2 py-2.5 text-center text-xs font-medium text-primary sm:text-sm"
          >
            کارت دیجیتال
          </Link>
          <Link
            href={timelineHref}
            className="min-h-11 rounded-xl border border-border bg-background px-2 py-2.5 text-center text-xs font-medium text-primary sm:text-sm"
          >
            روند
          </Link>
          {filesEnabled ? (
            <Link
              href={filesHref}
              className="min-h-11 rounded-xl border border-border bg-background px-2 py-2.5 text-center text-xs font-medium text-primary sm:text-sm"
            >
              فایل‌ها
            </Link>
          ) : (
            <span className="min-h-11 rounded-xl border border-dashed border-border px-2 py-2.5 text-center text-xs font-medium text-muted sm:text-sm">
              فایل‌ها
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
