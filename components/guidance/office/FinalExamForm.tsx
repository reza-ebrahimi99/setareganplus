"use client";

import { useMemo, useRef, useState } from "react";
import { saveFinalExamScoreAction } from "@/app/ms/grades/actions";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import {
  buildFinalExamViews,
  parseFinalExamScore,
  type FinalExamScoreMap,
} from "@/lib/guidance/office/final-exam";
import { MAJOR_OFFICE_TRANSCRIPT } from "@/lib/guidance/office/intake-href";

const GROUP_LABEL: Record<"general" | "specialized", string> = {
  general: "دروس عمومی",
  specialized: "دروس تخصصی",
};

export function FinalExamForm({
  examGroup,
  initialScores,
}: {
  examGroup: GuidanceExamGroup;
  initialScores: FinalExamScoreMap;
}) {
  const [scores, setScores] = useState<FinalExamScoreMap>(initialScores);
  const [saveLabel, setSaveLabel] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { subjects, summary } = useMemo(
    () => buildFinalExamViews(examGroup, scores),
    [examGroup, scores],
  );

  function queueSave(subjectId: string, raw: string) {
    const parsed = raw.trim() === "" ? null : parseFinalExamScore(raw);
    setScores((prev) => ({ ...prev, [subjectId]: parsed }));
    if (timers.current[subjectId]) clearTimeout(timers.current[subjectId]);
    timers.current[subjectId] = setTimeout(() => {
      void persist(subjectId, raw);
    }, 500);
  }

  async function persist(subjectId: string, raw: string) {
    if (raw.trim() && parseFinalExamScore(raw) === null) {
      setError("نمره باید بین ۰ تا ۲۰ باشد.");
      setSaveLabel("error");
      return;
    }
    setSaveLabel("saving");
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("score", raw);
    const result = await saveFinalExamScoreAction(form);
    if (!result.ok) {
      setError(result.error ?? "ذخیره نشد.");
      setSaveLabel("error");
      return;
    }
    setError(null);
    setSaveLabel("saved");
  }

  const generals = subjects.filter((row) => row.group === "general");
  const specialized = subjects.filter((row) => row.group === "specialized");

  return (
    <div className="chamber-sheet" dir="rtl">
      <p className={`chamber-save${saveLabel === "idle" ? "" : " is-on"}`} aria-live="polite">
        {saveLabel === "saving" ? "…" : saveLabel === "saved" ? "ثبت شد" : saveLabel === "error" ? error : ""}
      </p>

      <p className="chamber-kicker">
        {toPersianDigits(summary.entered)} از {toPersianDigits(summary.total)}
        {summary.average != null
          ? ` · معدل ${toPersianDigits(summary.average.toFixed(2))}`
          : ""}
      </p>

      {error ? (
        <p className="chamber-alert" role="alert">
          {error}
        </p>
      ) : null}

      {[generals, specialized].map((group) =>
        group.length === 0 ? null : (
          <section
            key={group[0]?.group}
            className="chamber-ledger"
            aria-label={GROUP_LABEL[group[0]!.group]}
          >
            <h2>{GROUP_LABEL[group[0]!.group]}</h2>
            <ol>
              {group.map((subject) => (
                <li key={subject.id} data-status={subject.status}>
                  <label htmlFor={`score-${subject.id}`}>
                    <span>{subject.label}</span>
                    <em>
                      {subject.status === "valid"
                        ? "ثبت شد"
                        : subject.status === "invalid"
                          ? "نامعتبر"
                          : "خالی"}
                    </em>
                  </label>
                  <input
                    id={`score-${subject.id}`}
                    name={subject.id}
                    type="text"
                    inputMode="decimal"
                    placeholder="۰ تا ۲۰"
                    defaultValue={
                      subject.score == null ? "" : String(subject.score)
                    }
                    aria-invalid={subject.status === "invalid"}
                    onChange={(event) =>
                      queueSave(subject.id, event.currentTarget.value)
                    }
                    onBlur={(event) =>
                      void persist(subject.id, event.currentTarget.value)
                    }
                  />
                </li>
              ))}
            </ol>
          </section>
        ),
      )}

      {summary.complete ? (
        <section className="chamber-mean" aria-live="polite">
          <p className="chamber-kicker">تصویر توانایی‌ها کامل شد</p>
          <h2>{toPersianDigits((summary.average ?? 0).toFixed(2))}</h2>
          {summary.strengths.length > 0 ? (
            <p>نقاط قوت: {summary.strengths.join("، ")}</p>
          ) : null}
          {summary.weaknesses.length > 0 ? (
            <p>نیاز به تقویت: {summary.weaknesses.join("، ")}</p>
          ) : (
            <p>نمره ضعیف ثبت نشده است.</p>
          )}
          <a href={MAJOR_OFFICE_TRANSCRIPT} className="chamber-go">
            آخرین قطعه از تصویر تحصیلی
          </a>
        </section>
      ) : (
        <p className="chamber-lead">پس از ورود همه نمرات، مهر سند باز می‌شود.</p>
      )}
    </div>
  );
}
