import Image from "next/image";
import {
  studentDisplayName,
  studentInitials,
} from "@/components/assessments/top-results/display";
import type { PublicAssessmentTopResult } from "@/lib/assessment/featured-results";

type StudentAvatarProps = {
  result: PublicAssessmentTopResult;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "size-12 text-sm",
  md: "size-16 text-base",
  lg: "size-24 text-2xl sm:size-28 sm:text-3xl",
} as const;

/**
 * Portrait when available; otherwise branded school-color gradient + initials.
 * Never a gray placeholder.
 */
export function StudentAvatar({
  result,
  size = "md",
  className = "",
}: StudentAvatarProps) {
  const name = studentDisplayName(result);
  const initials = studentInitials(result);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] ${SIZE_CLASS[size]} ${className}`}
    >
      {result.studentPortraitUrl ? (
        <Image
          src={result.studentPortraitUrl}
          alt=""
          fill
          unoptimized
          sizes={size === "lg" ? "112px" : size === "md" ? "64px" : "48px"}
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b1220] via-[#1e3a5f] to-[#d4af37] font-bold tracking-tight text-white"
        >
          {initials}
        </div>
      )}
      <span className="sr-only">تصویر {name}</span>
    </div>
  );
}
