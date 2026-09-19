"use client";

import { useRouter } from "next/navigation";

type AdvisorOption = {
  id: string;
  displayName: string;
};

export function CounselorCalendarSelect(props: {
  advisors: AdvisorOption[];
  selectedId: string;
  dirty?: boolean;
}) {
  const router = useRouter();

  return (
    <label className="cos-counselor-select">
      انتخاب مشاور
      <select
        name="advisorId"
        value={props.selectedId}
        onChange={(event) => {
          const next = event.target.value;
          if (next === props.selectedId) return;
          if (
            props.dirty &&
            !window.confirm(
              "تغییرات برنامه ذخیره نشده است. بدون ذخیره به مشاور دیگر بروید؟",
            )
          ) {
            event.target.value = props.selectedId;
            return;
          }
          router.push(
            next
              ? `/admin/counselor/calendar?advisorId=${encodeURIComponent(next)}`
              : "/admin/counselor/calendar",
          );
        }}
      >
        {props.advisors.map((advisor) => (
          <option key={advisor.id} value={advisor.id}>
            {advisor.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
