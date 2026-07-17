"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  bulkAssignLeadOwnerAction,
  type BulkAssignLeadOwnerResult,
} from "@/app/admin/(dashboard)/leads/actions";
import { LeadOwnerBadge } from "@/components/admin/crm/LeadOwnerBadge";
import { LeadOwnerSelect } from "@/components/admin/crm/LeadOwnerSelect";
import type { LeadListFilters } from "@/lib/crm/lead-list-filters";
import { toPersianDigits } from "@/lib/persian";

export type LeadAssignmentTableRow = {
  id: string;
  name: string;
  stageName: string | null;
  score: number;
  scoreBand: string;
  ownerName: string | null;
  source: string;
};

type LeadAssignmentTableProps = {
  rows: LeadAssignmentTableRow[];
  owners: Array<{ id: string; name: string }>;
  canAssign: boolean;
  scope: string;
  filters: LeadListFilters;
  totalFiltered: number;
};

export function LeadAssignmentTable({
  rows,
  owners,
  canAssign,
  scope,
  filters,
  totalFiltered,
}: LeadAssignmentTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [ownerUserId, setOwnerUserId] = useState("");
  const [result, setResult] = useState<BulkAssignLeadOwnerResult | null>(null);
  const [pending, startTransition] = useTransition();
  const isSelected = (id: string) =>
    selectAllFiltered ? !excludedIds.has(id) : selectedIds.has(id);
  const allSelected = rows.length > 0 && rows.every((row) => isSelected(row.id));
  const selectedCount = selectAllFiltered
    ? Math.max(0, totalFiltered - excludedIds.size)
    : selectedIds.size;

  function toggleAll() {
    if (selectAllFiltered) {
      setExcludedIds((current) => {
        const next = new Set(current);
        for (const row of rows) {
          if (allSelected) next.add(row.id);
          else next.delete(row.id);
        }
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (allSelected) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    if (selectAllFiltered) {
      setExcludedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitAssignment() {
    setResult(null);
    startTransition(async () => {
      const nextResult = await bulkAssignLeadOwnerAction({
        leadIds: selectAllFiltered ? [] : [...selectedIds],
        selectAllFiltered,
        scope,
        filters,
        excludedLeadIds: selectAllFiltered ? [...excludedIds] : [],
        ownerUserId: ownerUserId || null,
      });
      setResult(nextResult);
      if (nextResult.ok) {
        setSelectedIds(new Set());
        setSelectAllFiltered(false);
        setExcludedIds(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="admin-card overflow-hidden">
      {canAssign ? (
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-56 text-sm">
            <span className="mb-1 block text-muted">تخصیص گروهی مسئول</span>
            <LeadOwnerSelect
              owners={owners}
              value={ownerUserId}
              onChange={(event) => setOwnerUserId(event.target.value)}
              className="w-full"
              disabled={pending}
            />
          </label>
          <button
            type="button"
            onClick={submitAssignment}
            disabled={pending || selectedCount === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "در حال تخصیص..."
              : `اعمال برای ${toPersianDigits(selectedCount)} لید`}
          </button>
          {result ? (
            <p
              role={result.ok ? "status" : "alert"}
              className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}
            >
              {result.ok ? result.message : result.error}
            </p>
          ) : null}
          </div>
          {!selectAllFiltered &&
          allSelected &&
          totalFiltered > rows.length ? (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <span>
                {toPersianDigits(rows.length)} لید این صفحه انتخاب شده است.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectAllFiltered(true);
                  setSelectedIds(new Set());
                  setExcludedIds(new Set());
                }}
                className="mr-2 font-semibold underline"
              >
                انتخاب همه {toPersianDigits(totalFiltered)} لید مطابق فیلتر
              </button>
            </div>
          ) : null}
          {selectAllFiltered ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <span>
                همه {toPersianDigits(totalFiltered)} لید مطابق فیلتر انتخاب شده‌اند
                {excludedIds.size
                  ? `؛ ${toPersianDigits(excludedIds.size)} مورد مستثنا شده است.`
                  : "."}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectAllFiltered(false);
                  setExcludedIds(new Set());
                  setSelectedIds(new Set());
                }}
                className="font-semibold underline"
              >
                لغو انتخاب
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto px-2 py-2">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border text-right text-xs text-muted">
              {canAssign ? (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="انتخاب همه لیدهای نمایش‌داده‌شده"
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 font-medium">نام</th>
              <th className="px-3 py-2 font-medium">مرحله</th>
              <th className="px-3 py-2 font-medium">امتیاز</th>
              <th className="px-3 py-2 font-medium">مسئول</th>
              <th className="px-3 py-2 font-medium">منبع</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60">
                {canAssign ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected(lead.id)}
                      onChange={() => toggleRow(lead.id)}
                      aria-label={`انتخاب ${lead.name}`}
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-primary hover:underline"
                  >
                    {lead.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{lead.stageName ?? "—"}</td>
                <td className="px-3 py-2">
                  {toPersianDigits(lead.score)} · {lead.scoreBand}
                </td>
                <td className="px-3 py-2">
                  <LeadOwnerBadge ownerName={lead.ownerName} />
                </td>
                <td className="px-3 py-2">{lead.source}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={canAssign ? 6 : 5}
                  className="px-3 py-8 text-center text-muted"
                >
                  لیدی با این فیلتر پیدا نشد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
