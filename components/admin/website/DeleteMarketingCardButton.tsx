"use client";

import { deleteMarketingCardAction } from "@/app/admin/(dashboard)/website/marketing-cards/actions";

export function DeleteMarketingCardButton({ cardId }: { cardId: string }) {
  return (
    <form
      action={deleteMarketingCardAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "این کارت حذف شود؟ در صورت نبود کارت فعال، صفحه اصلی به کارت‌های ثابت برمی‌گردد.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="cardId" value={cardId} />
      <button
        type="submit"
        className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800"
      >
        حذف
      </button>
    </form>
  );
}
