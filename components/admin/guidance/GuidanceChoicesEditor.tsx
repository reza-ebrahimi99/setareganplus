"use client";

/**
 * Guidance Journey Engine Step 10 — counselor import/edit/approve UI.
 */

import { useState, useTransition } from "react";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceMajorChoiceRow } from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import type {
  Step10AdminActionResult,
} from "@/app/admin/(dashboard)/guidance/[publicId]/choices/actions";

const SAMPLE_JSON = JSON.stringify(
  [
    { rank: 1, university: "دانشگاه تهران", major: "مهندسی کامپیوتر", city: "تهران", educationType: "روزانه" },
    { rank: 2, university: "دانشگاه شریف", major: "مهندسی کامپیوتر", city: "تهران", educationType: "روزانه" },
  ],
  null,
  2,
);

export function GuidanceChoicesEditor({
  publicId,
  initialChoices,
  approved,
  importAction,
  updateRowAction,
  approveAction,
}: {
  publicId: string;
  initialChoices: GuidanceMajorChoiceRow[];
  approved: boolean;
  importAction: (input: { publicId: string; rawJson: string }) => Promise<Step10AdminActionResult>;
  updateRowAction: (input: {
    publicId: string;
    choiceId: string;
    university: string;
    major: string;
    city: string;
    educationType: string;
    rank: number;
    notes: string;
  }) => Promise<Step10AdminActionResult>;
  approveAction: (publicId: string) => Promise<Step10AdminActionResult>;
}) {
  const [choices, setChoices] = useState(initialChoices);
  const [rawJson, setRawJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleImport() {
    setMessage(null);
    startTransition(async () => {
      const result = await importAction({ publicId, rawJson });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("گزینه‌ها با موفقیت وارد شدند.");
      window.location.reload();
    });
  }

  function updateLocal(id: string, patch: Partial<GuidanceMajorChoiceRow>) {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function saveRow(row: GuidanceMajorChoiceRow) {
    startTransition(async () => {
      await updateRowAction({
        publicId,
        choiceId: row.id,
        university: row.university,
        major: row.major,
        city: row.city,
        educationType: row.educationType,
        rank: row.rank,
        notes: row.notes,
      });
      setMessage(`ردیف ${toPersianDigits(row.rank)} ذخیره شد.`);
    });
  }

  function handleApprove() {
    setMessage(null);
    startTransition(async () => {
      const result = await approveAction(publicId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {message && <p className="counselor-case__muted">{message}</p>}

      <details className="admin-card" open={choices.length === 0}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          ورود گزینه‌ها از خروجی Entekhabium (JSON)
        </summary>
        <p className="counselor-case__muted" style={{ marginTop: "0.5rem" }}>
          آرایه‌ای از آبجکت‌ها با کلیدهای rank, university, major, city,
          educationType را اینجا بچسبان.
        </p>
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          placeholder={SAMPLE_JSON}
          rows={8}
          style={{ width: "100%", fontFamily: "monospace", fontSize: "0.75rem", marginTop: "0.5rem" }}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={pending || !rawJson.trim()}
          className="counselor-case__link"
          style={{ marginTop: "0.5rem" }}
        >
          وارد کردن گزینه‌ها
        </button>
      </details>

      {choices.length > 0 && (
        <div className="admin-card" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <strong>{toPersianDigits(choices.length)} گزینه</strong>
            <button
              type="button"
              onClick={handleApprove}
              disabled={pending || approved}
              className="counselor-case__link"
            >
              {approved ? "تأیید شده" : "تأیید نهایی و نمایش به دانش‌آموز"}
            </button>
          </div>

          <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "right" }}>
                <th>رتبه</th>
                <th>دانشگاه</th>
                <th>رشته</th>
                <th>شهر</th>
                <th>نوع دوره</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {choices.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ width: "3.5rem" }}>
                    <input
                      type="number"
                      value={row.rank}
                      onChange={(e) => updateLocal(row.id, { rank: Number(e.target.value) })}
                      style={{ width: "3rem" }}
                    />
                  </td>
                  <td>
                    <input
                      value={row.university}
                      onChange={(e) => updateLocal(row.id, { university: e.target.value })}
                    />
                  </td>
                  <td>
                    <input value={row.major} onChange={(e) => updateLocal(row.id, { major: e.target.value })} />
                  </td>
                  <td>
                    <input value={row.city} onChange={(e) => updateLocal(row.id, { city: e.target.value })} />
                  </td>
                  <td>
                    <input
                      value={row.educationType}
                      onChange={(e) => updateLocal(row.id, { educationType: e.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => saveRow(row)} disabled={pending} className="counselor-case__link">
                      ذخیره
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
