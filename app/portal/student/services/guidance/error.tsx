"use client";

import { GuidanceErrorFallback } from "@/components/guidance/office/GuidanceErrorFallback";

export default function GuidancePortalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  return (
    <GuidanceErrorFallback
      error={error}
      retry={unstable_retry ?? reset}
      homeHref="/portal/student/services/guidance"
      homeLabel="بازگشت به داشبورد انتخاب رشته"
    />
  );
}
