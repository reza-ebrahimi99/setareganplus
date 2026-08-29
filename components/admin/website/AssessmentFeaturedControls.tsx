"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  autoSelectFeaturedResultsFormAction,
  type FeaturedSelectActionState,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { toPersianDigits } from "@/lib/persian";

type Props = {
  assessmentId: string;
  featuredCount: number;
  featuredResultsLimit: number;
  publishFeaturedResults: boolean;
  isPublished: boolean;
};

const initial: FeaturedSelectActionState = {};

function AutoSelectButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-medium text-primary disabled:opacity-60"
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        if (
          !window.confirm(
            "برترین‌های این آزمون بر اساس تراز، رتبه مدرسه و نمره دوباره انتخاب شوند؟ انتخاب‌های قبلی همین آزمون پاک می‌شوند.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "در حال انتخاب…" : "انتخاب خودکار برترین‌ها"}
    </button>
  );
}

export function AssessmentFeaturedControls({
  assessmentId,
  featuredCount,
  featuredResultsLimit,
  publishFeaturedResults,
  isPublished,
}: Props) {
  const [state, action] = useActionState(
    autoSelectFeaturedResultsFormAction,
    initial,
  );

  return (
    <section className="admin-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-primary">
          انتخاب برترین‌ها
        </h2>
        <p className="mt-1 text-sm leading-7 text-muted">
          ترتیب انتخاب: تراز (نزولی) ← رتبه مدرسه (صعودی) ← نمره (نزولی). حداکثر{" "}
          {toPersianDigits(featuredResultsLimit)} نتیجه واجد شرایط انتخاب
          می‌شود. نتایج حذف‌شده یا دانش‌آموزان غیرفعال نادیده گرفته می‌شوند.
        </p>
      </div>

      {!isPublished ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950"
        >
          صفحه آزمون هنوز منتشر نشده است؛ حتی با روشن بودن انتشار برترین‌ها،
          نتایج در سایت عمومی نمایش داده نمی‌شوند.
        </p>
      ) : null}

      {isPublished && !publishFeaturedResults ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950"
        >
          انتشار عمومی برترین‌ها خاموش است. انتخاب‌های فعلی حفظ می‌شوند اما در
          سایت عمومی نشان داده نمی‌شوند.
        </p>
      ) : null}

      <p className="text-sm text-muted">
        برترین‌های انتخاب‌شده فعلاً:{" "}
        <strong className="text-primary">
          {toPersianDigits(featuredCount)}
        </strong>
      </p>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <form action={action} className="flex flex-wrap gap-3">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <AutoSelectButton />
      </form>
    </section>
  );
}
