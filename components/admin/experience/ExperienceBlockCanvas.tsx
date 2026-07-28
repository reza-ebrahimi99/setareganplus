"use client";

import Link from "next/link";
import {
  deleteBlockAction,
  duplicateBlockAction,
  reorderBlockAction,
  setBlockEnabledAction,
} from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import type { ExperienceAdminBlockDto } from "@/components/admin/experience/types";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

type ExperienceBlockCanvasProps = {
  flowId: string;
  experienceId: string;
  versionId: string;
  blocks: ExperienceAdminBlockDto[];
  canManage: boolean;
  selectedBlockId: string | null;
};

function scheduleSummary(block: ExperienceAdminBlockDto): string {
  if (!block.opensAtIso && !block.closesAtIso) return "بدون زمان‌بندی";
  const parts: string[] = [];
  if (block.opensAtIso) {
    parts.push(`از ${formatJalaliDateTimeShort(new Date(block.opensAtIso))}`);
  }
  if (block.closesAtIso) {
    parts.push(`تا ${formatJalaliDateTimeShort(new Date(block.closesAtIso))}`);
  }
  return parts.join(" · ");
}

function mediaSummary(block: ExperienceAdminBlockDto): string {
  const roles = Object.keys(block.mediaValues);
  if (roles.length === 0) return "بدون رسانه";
  return `${toPersianDigits(roles.length)} رسانه`;
}

export function ExperienceBlockCanvas({
  flowId,
  experienceId,
  versionId,
  blocks,
  canManage,
  selectedBlockId,
}: ExperienceBlockCanvasProps) {
  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted">
        هنوز بلوکی به پیش‌نویس اضافه نشده است.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {blocks.map((block, index) => {
        const selected = selectedBlockId === block.id;
        return (
          <li
            key={block.id}
            className={`rounded-2xl border bg-white p-4 ${
              selected ? "border-secondary shadow-sm" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {toPersianDigits(index + 1)}. {block.labelFa}
                </p>
                <p className="mt-1 text-xs text-muted">
                  نوع: {block.type} ·{" "}
                  {block.enabled ? "فعال" : "غیرفعال"} · {scheduleSummary(block)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {mediaSummary(block)}
                </p>
                {block.diagnostics.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
                    {block.diagnostics.map((item, diagIndex) => (
                      <li key={`${item.code}-${diagIndex}`}>{item.message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/registrations/flows/${flowId}/experience?blockId=${encodeURIComponent(block.id)}`}
                    className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-3 text-sm"
                  >
                    ویرایش
                  </Link>

                  <form action={duplicateBlockAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    >
                      تکثیر
                    </button>
                  </form>

                  <form action={setBlockEnabledAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={block.enabled ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm"
                    >
                      {block.enabled ? "غیرفعال کردن" : "فعال کردن"}
                    </button>
                  </form>

                  <form action={reorderBlockAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="experienceId" value={experienceId} />
                    <input type="hidden" name="versionId" value={versionId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-40"
                    >
                      بالا
                    </button>
                  </form>

                  <form action={reorderBlockAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="experienceId" value={experienceId} />
                    <input type="hidden" name="versionId" value={versionId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === blocks.length - 1}
                      className="min-h-11 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-40"
                    >
                      پایین
                    </button>
                  </form>

                  <form
                    action={deleteBlockAction}
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          "این بلوک از پیش‌نویس حذف شود؟",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800"
                    >
                      حذف از پیش‌نویس
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
