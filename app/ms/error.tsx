"use client";

import { GuidanceErrorFallback } from "@/components/guidance/office/GuidanceErrorFallback";

export default function MajorOfficeError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  return (
    <GuidanceErrorFallback error={error} retry={unstable_retry ?? reset} />
  );
}
