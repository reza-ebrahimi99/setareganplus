/**
 * Chamber chrome labels — presentation only.
 */

import {
  MAJOR_OFFICE_HOME,
  MAJOR_OFFICE_INTEREST,
  MAJOR_OFFICE_JOURNEY,
  MAJOR_OFFICE_SESSION,
} from "@/lib/guidance/office/nav";
import {
  MAJOR_OFFICE_ACADEMIC,
  MAJOR_OFFICE_GRADES,
  MAJOR_OFFICE_IDENTITY,
  MAJOR_OFFICE_TRANSCRIPT,
} from "@/lib/guidance/office/intake-href";

export function chamberRoomKey(pathname: string): string {
  if (pathname.includes("/identity") || pathname.includes("/onboarding")) {
    return "identity";
  }
  if (pathname.includes("/academic")) return "academic";
  if (pathname.includes("/grades")) return "grades";
  if (pathname.includes("/transcript")) return "transcript";
  if (pathname.includes("/interest")) return "interest";
  if (pathname.includes("/session")) return "session";
  if (pathname.includes("/journey")) return "journey";
  if (pathname.includes("/guidance/steps/12")) return "archive";
  if (pathname.includes("/guidance/steps/")) return "engine";
  if (pathname === MAJOR_OFFICE_HOME || pathname === `${MAJOR_OFFICE_HOME}/`) {
    return "home";
  }
  return "office";
}

export function chamberStatusLabel(pathname: string): string {
  if (pathname === MAJOR_OFFICE_IDENTITY) return "کی هستید";
  if (pathname === MAJOR_OFFICE_ACADEMIC) return "تصویر تحصیلی";
  if (pathname === MAJOR_OFFICE_GRADES) return "توانایی‌های شما";
  if (pathname === MAJOR_OFFICE_TRANSCRIPT) return "آخرین قطعه تصویر";
  if (pathname === MAJOR_OFFICE_SESSION || pathname.startsWith(`${MAJOR_OFFICE_SESSION}/`)) {
    return "نخستین گفتگو";
  }
  if (pathname === MAJOR_OFFICE_INTEREST || pathname.startsWith(`${MAJOR_OFFICE_INTEREST}/`)) {
    return "نگاه اول به شخصیت";
  }
  if (pathname === MAJOR_OFFICE_JOURNEY || pathname.startsWith(`${MAJOR_OFFICE_JOURNEY}/`)) {
    return "مسیر همراهی";
  }
  if (pathname.includes("/guidance/steps/3")) return "فعال‌سازی همراهی";
  if (pathname.includes("/guidance/steps/5")) return "رتبه و سنجش";
  if (pathname.includes("/guidance/steps/6")) return "نظام آموزشی";
  if (pathname.includes("/guidance/steps/7")) return "شهرها";
  if (pathname.includes("/guidance/steps/8")) return "رشته‌ها";
  if (pathname.includes("/guidance/steps/9")) return "وزن زندگی";
  if (pathname.includes("/guidance/steps/10")) return "انتخابیوم";
  if (pathname.includes("/guidance/steps/11")) return "گفتگوی دوم";
  if (pathname.includes("/guidance/steps/12")) return "تأیید نهایی";
  if (pathname === MAJOR_OFFICE_HOME) return "دفتر شما";
  return "دفتر انتخاب رشته";
}
