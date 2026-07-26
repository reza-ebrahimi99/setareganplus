"use client";

import { deleteTopRankArchiveAction } from "@/app/admin/(dashboard)/website/top-rank-archive/actions";
import { toPersianDigits } from "@/lib/persian";

export function TopRankArchiveDeleteButton({
  archiveId,
  year,
}: {
  archiveId: string;
  year: number;
}) {
  return (
    <form
      action={deleteTopRankArchiveAction}
      onSubmit={(event) => {
        const ok = window.confirm(
          `آیا از حذف آرشیو سال ${toPersianDigits(year)} مطمئن هستید؟`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="archiveId" value={archiveId} />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800"
      >
        حذف
      </button>
    </form>
  );
}
