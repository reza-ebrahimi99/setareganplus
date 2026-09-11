"use client";

import {
  type FormEvent,
  useActionState,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { submitGuidanceV2Step3Action } from "@/app/portal/student/services/guidance/journey/steps/actions/step3";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import { GuidanceJourneyV2Nav } from "@/components/guidance/journey-v2/GuidanceJourneyV2Nav";
import { GuidanceJourneyV2Shell } from "@/components/guidance/journey-v2/GuidanceJourneyV2Shell";
import {
  RequiredStar,
  SubjectIcon,
} from "@/components/guidance/journey-v2/GuidanceV2Icons";
import { GuidanceFileUploadField } from "@/components/guidance/shared/GuidanceFileUploadField";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/steps";
import type {
  FinalExamScoreMap,
  FinalExamSubject,
} from "@/lib/guidance/office/final-exam";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

const initial: JourneyV2FormState = {};

function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String("٠١٢٣٤٥٦٧٨٩".indexOf(char)));
}

export function FinalGradesV2Step({
  sidebarSteps,
  completionPercentage,
  subjects,
  scores,
  existingTranscriptName,
}: {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  subjects: readonly FinalExamSubject[];
  scores: FinalExamScoreMap;
  existingTranscriptName: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action] = useActionState(submitGuidanceV2Step3Action, initial);

  const [draftScores, setDraftScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      subjects.map((subject) => [
        subject.id,
        String(scores[subject.id] ?? ""),
      ]),
    ),
  );

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  if (state.ok) {
    router.replace(guidanceJourneyV2StepPath(4));
  }

  const serverErrors = state.fieldErrors ?? {};
  const errors = { ...serverErrors, ...clientErrors };

  const general = subjects.filter((subject) => subject.group === "general");
  const specialized = subjects.filter(
    (subject) => subject.group === "specialized",
  );

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    const nextErrors: Record<string, string> = {};

    for (const subject of subjects) {
      const key = `score_${subject.id}`;
      const raw = draftScores[subject.id]?.trim() ?? "";

      if (!raw) {
        nextErrors[key] = "نمره این درس را وارد کنید.";
        continue;
      }

      const normalized = latinDigits(raw).replace(",", ".");
      const numeric = Number(normalized);

      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20) {
        nextErrors[key] = "نمره باید بین ۰ تا ۲۰ باشد.";
      }
    }

    const form = formRef.current;
    const file = form
      ? (new FormData(form).get("transcript") as File | null)
      : null;

    if (
      !existingTranscriptName &&
      (!file || !file.name)
    ) {
      nextErrors.transcript = "بارگذاری کارنامه نهایی الزامی است.";
    }

    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      setClientErrors(nextErrors);

      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector(
          '[aria-invalid="true"], .gjv2-form-error',
        );

        firstInvalid?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    } else {
      setClientErrors({});
    }
  }

  return (
    <GuidanceJourneyV2Shell
      stepId={3}
      stepCount={18}
      title="نمرات نهایی خرداد"
      description="نمره کتبی امتحان نهایی هر درس را وارد و تصویر یا PDF کارنامه را بارگذاری کنید."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
    >
      <form
        ref={formRef}
        action={action}
        onSubmit={validateBeforeSubmit}
        encType="multipart/form-data"
        className="gjv2-form-card"
        noValidate
      >
        {state.error ? (
          <p className="gpj-banner gpj-banner--error">{state.error}</p>
        ) : null}

        <div className="gjv2-info-banner">
          <span>ⓘ</span>
          <strong>فقط نمره کتبی امتحان نهایی را وارد کنید.</strong>
        </div>

        <GradeGroup
          title="دروس عمومی"
          rows={general}
          values={draftScores}
          errors={errors}
          onChange={(id, value) => {
            setDraftScores((current) => ({ ...current, [id]: value }));
            setClientErrors((current) => {
              const next = { ...current };
              delete next[`score_${id}`];
              return next;
            });
          }}
        />

        <GradeGroup
          title="دروس تخصصی"
          rows={specialized}
          values={draftScores}
          errors={errors}
          onChange={(id, value) => {
            setDraftScores((current) => ({ ...current, [id]: value }));
            setClientErrors((current) => {
              const next = { ...current };
              delete next[`score_${id}`];
              return next;
            });
          }}
        />

        <section className="gjv2-upload-section">
          <GuidanceFileUploadField
            id="transcript"
            name="transcript"
            required={!existingTranscriptName}
            accept="application/pdf,image/jpeg,image/png"
            title="بارگذاری کارنامه نهایی"
            helper="فایل PDF یا تصویر · حداکثر ۵ مگابایت"
            existingLabel={
              existingTranscriptName
                ? `فایل فعلی: ${existingTranscriptName}`
                : null
            }
            error={errors.transcript ?? null}
            onFileChange={() =>
              setClientErrors((current) => {
                const next = { ...current };
                delete next.transcript;
                return next;
              })
            }
          />
        </section>

        <GuidanceJourneyV2Nav
          previous={{
            label: "برگشت",
            onClick: () => router.push(guidanceJourneyV2StepPath(2)),
          }}
          next={{ label: "ذخیره و رفتن به مرحله بعد" }}
        />
      </form>
    </GuidanceJourneyV2Shell>
  );
}

function GradeGroup({
  title,
  rows,
  values,
  errors,
  onChange,
}: {
  title: string;
  rows: readonly FinalExamSubject[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  if (!rows.length) return null;

  return (
    <section className="gjv2-grade-section">
      <h2>{title}</h2>

      <div className="gjv2-grade-grid">
        {rows.map((subject) => {
          const key = `score_${subject.id}`;
          const error = errors[key];

          return (
            <div
              className={`gjv2-grade-card${
                error ? " gjv2-grade-card--error" : ""
              }`}
              key={subject.id}
            >
              <div className="gjv2-grade-card__head">
                <SubjectIcon label={subject.label} />

                <label htmlFor={key}>
                  {subject.label}
                  <RequiredStar />
                </label>
              </div>

              <input
                id={key}
                name={key}
                type="text"
                inputMode="decimal"
                placeholder="۰ تا ۲۰"
                value={values[subject.id] ?? ""}
                onChange={(event) =>
                  onChange(subject.id, event.currentTarget.value)
                }
                className="gjv2-grade-input"
                aria-invalid={Boolean(error)}
              />

              {error ? (
                <p className="gjv2-form-error">{error}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
