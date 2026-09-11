"use client";

import { useActionState, useMemo, useState } from "react";
import {
  addChoiceItemAction,
  duplicateChoiceItemAction,
  markArrangementReadyAction,
  moveChoiceItemAction,
  removeChoiceItemAction,
  reorderChoiceItemsAction,
  startArrangementAction,
  updateChoiceItemAction,
  type CounselorLateState,
} from "@/app/admin/counselor/late-actions";
import { CHOICE_BANDS } from "@/lib/guidance/journey-v2/constants";
import { GUIDANCE_EDUCATION_TYPES } from "@/lib/guidance/journey/reference-data/education-types";
import { labelChoiceBand, labelChoiceFeedback } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { toPersianDigits } from "@/lib/persian";

const initial: CounselorLateState = {};

export function ChoiceWorkspace(props: {
  studentId: string;
  studentName: string;
  phase: "initial" | "final" | "review";
  list: ChoiceListView | null;
  intelligence: Array<{ label: string; value: string }>;
}) {
  const [query, setQuery] = useState("");
  const [addState, addAction, addPending] = useActionState(addChoiceItemAction, initial);
  const [readyState, readyAction, readyPending] = useActionState(
    markArrangementReadyAction,
    initial,
  );
  const [startState, startAction, startPending] = useActionState(startArrangementAction, initial);
  const [reorderState, reorderAction] = useActionState(reorderChoiceItemsAction, initial);

  const list = props.list;
  const items = useMemo(() => {
    const rows = (list?.items ?? []).filter((i) => i.isActive);
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((i) =>
      [i.major, i.university, i.city, i.province, i.officialCode ?? ""].some((v) => v.includes(q)),
    );
  }, [list, query]);

  if (!list) {
    return (
      <form action={startAction} className="cos-panel">
        <input type="hidden" name="studentId" value={props.studentId} />
        <input type="hidden" name="kind" value={props.phase === "final" ? "FINAL" : "INITIAL"} />
        <p>هنوز فهرستی برای این مرحله ساخته نشده است.</p>
        <button type="submit" className="cos-btn cos-btn--primary" disabled={startPending}>
          {startPending ? "…" : "شروع چیدمان"}
        </button>
        {startState.error ? <p className="cos-error">{startState.error}</p> : null}
      </form>
    );
  }

  const locked = list.status === "READY" && props.phase === "initial";
  const confirmed = list.status === "CONFIRMED";

  return (
    <div className="cos-choice-os">
      <aside className="cos-choice-os__intel">
        <h2>هوش پرونده</h2>
        <dl>
          {props.intelligence.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="cos-choice-os__main">
        <header className="cos-choice-os__toolbar">
          <div>
            <p>
              {props.phase === "final"
                ? "اصلاحات نهایی"
                : props.phase === "review"
                  ? "بازخورد دانش‌آموز"
                  : "چیدمان اولیه"}
            </p>
            <h1>{props.studentName}</h1>
            <p>
              نسخه {toPersianDigits(list.version)} · {items.length} انتخاب فعال
            </p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو"
          />
        </header>

        {addState.error || readyState.error || reorderState.error ? (
          <p className="cos-error">
            {addState.error || readyState.error || reorderState.error}
          </p>
        ) : null}
        {addState.success || readyState.success ? (
          <p className="cos-success">{addState.success || readyState.success}</p>
        ) : null}

        {!locked && !confirmed && props.phase !== "review" ? (
          <form action={addAction} className="cos-choice-os__add">
            <input type="hidden" name="studentId" value={props.studentId} />
            <input type="hidden" name="listId" value={list.id} />
            <input name="major" placeholder="رشته" required />
            <input name="university" placeholder="دانشگاه / مؤسسه" required />
            <input name="city" placeholder="شهر" />
            <input name="province" placeholder="استان" />
            <select name="educationType">
              <option value="">نوع دوره</option>
              {GUIDANCE_EDUCATION_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
            <input name="admissionType" placeholder="نوع پذیرش" />
            <input name="officialCode" placeholder="کد رسمی (فقط اگر واقعی است)" />
            <select name="band">
              <option value="">دسته</option>
              {CHOICE_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <input name="notes" placeholder="یادداشت" />
            <input name="rationale" placeholder="دلیل مشاور" />
            <button type="submit" className="cos-btn cos-btn--primary" disabled={addPending}>
              افزودن
            </button>
          </form>
        ) : null}

        <div className="cos-choice-os__table-wrap">
          <table className="cos-choice-os__table">
            <thead>
              <tr>
                <th>#</th>
                <th>رشته</th>
                <th>دانشگاه</th>
                <th>شهر</th>
                <th>دوره</th>
                <th>کد</th>
                <th>دسته</th>
                <th>بازخورد</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{toPersianDigits(item.sortOrder)}</td>
                  <td>{item.major}</td>
                  <td>{item.university}</td>
                  <td>{item.city || item.province || "—"}</td>
                  <td>{item.educationTypeLabel}</td>
                  <td>{item.officialCode || "—"}</td>
                  <td>{labelChoiceBand(item.band)}</td>
                  <td>
                    {item.feedback?.verdict
                      ? `${labelChoiceFeedback(item.feedback.verdict)}${item.feedback.note ? ` — ${item.feedback.note}` : ""}`
                      : "—"}
                  </td>
                  <td className="cos-choice-os__ops">
                    {locked || confirmed || props.phase === "review" ? null : (
                      <>
                        <TinyAction
                          studentId={props.studentId}
                          listId={list.id}
                          itemId={item.id}
                          action={moveChoiceItemAction}
                          extra={{ direction: "up" }}
                          label="↑"
                        />
                        <TinyAction
                          studentId={props.studentId}
                          listId={list.id}
                          itemId={item.id}
                          action={moveChoiceItemAction}
                          extra={{ direction: "down" }}
                          label="↓"
                        />
                        <TinyAction
                          studentId={props.studentId}
                          listId={list.id}
                          itemId={item.id}
                          action={duplicateChoiceItemAction}
                          label="کپی"
                        />
                        <TinyAction
                          studentId={props.studentId}
                          listId={list.id}
                          itemId={item.id}
                          action={removeChoiceItemAction}
                          label="حذف"
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!locked && !confirmed && props.phase !== "review" && items[0] ? (
          <details className="cos-choice-os__edit-box">
            <summary>ویرایش انتخاب موجود (ردیف اول فهرست فیلترشده، شناسه را عوض کنید)</summary>
            <InlineEdit
              studentId={props.studentId}
              listId={list.id}
              item={items[0]!}
              itemOptions={items}
            />
          </details>
        ) : null}

        {!locked && !confirmed && props.phase !== "review" ? (
          <form action={reorderAction} className="cos-choice-os__reorder">
            <input type="hidden" name="studentId" value={props.studentId} />
            <input type="hidden" name="listId" value={list.id} />
            <input
              type="hidden"
              name="orderedIds"
              value={items.map((i) => i.id).join(",")}
            />
            <p className="cos-muted">ترتیب با دکمه‌های بالا/پایین ذخیره می‌شود.</p>
          </form>
        ) : null}

        {props.phase !== "review" && !confirmed ? (
          <form action={readyAction} className="cos-choice-os__ready">
            <input type="hidden" name="studentId" value={props.studentId} />
            <input type="hidden" name="listId" value={list.id} />
            <input type="hidden" name="phase" value={props.phase === "final" ? "final" : "initial"} />
            <input name="reason" placeholder="یادداشت آمادگی (اختیاری)" />
            <button type="submit" className="cos-btn cos-btn--primary" disabled={readyPending || locked}>
              {props.phase === "final"
                ? "نسخه نهایی آماده تأیید دانش‌آموز است"
                : "نسخه اولیه چیدمان آماده است"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TinyAction(props: {
  studentId: string;
  listId: string;
  itemId: string;
  action: (prev: CounselorLateState, formData: FormData) => Promise<CounselorLateState>;
  extra?: Record<string, string>;
  label: string;
}) {
  const [, formAction, pending] = useActionState(props.action, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input type="hidden" name="itemId" value={props.itemId} />
      {Object.entries(props.extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="cos-btn cos-btn--ghost" disabled={pending}>
        {props.label}
      </button>
    </form>
  );
}

function InlineEdit(props: {
  studentId: string;
  listId: string;
  item: ChoiceListView["items"][number];
  itemOptions?: ChoiceListView["items"];
}) {
  const [state, action, pending] = useActionState(updateChoiceItemAction, initial);
  const [itemId, setItemId] = useState(props.item.id);
  const item = props.itemOptions?.find((i) => i.id === itemId) ?? props.item;
  return (
    <form action={action} className="cos-choice-os__inline" key={item.id}>
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input type="hidden" name="itemId" value={item.id} />
      {props.itemOptions ? (
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {props.itemOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.sortOrder}. {opt.major} — {opt.university}
            </option>
          ))}
        </select>
      ) : null}
      <input name="major" defaultValue={item.major} required />
      <input name="university" defaultValue={item.university} required />
      <input name="city" defaultValue={item.city} />
      <input name="province" defaultValue={item.province} />
      <input name="educationType" defaultValue={item.educationType} />
      <input name="admissionType" defaultValue={item.admissionType} />
      <input name="officialCode" defaultValue={item.officialCode ?? ""} />
      <select name="band" defaultValue={item.band ?? ""}>
        <option value="">دسته</option>
        {CHOICE_BANDS.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <input name="notes" defaultValue={item.notes} />
      <input name="rationale" defaultValue={item.rationale} />
      <button type="submit" disabled={pending}>
        ذخیره
      </button>
      {state.error ? <span className="cos-error">{state.error}</span> : null}
    </form>
  );
}
