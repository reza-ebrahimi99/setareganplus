import type { AiCrmEntities } from "@/types/ai-crm";

function normalize(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAsciiDigits(value: string): string {
  const map: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return value.replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d);
}

function extractPhone(text: string): string | null {
  const ascii = toAsciiDigits(text);
  const match = ascii.match(/(?:\+98|0098|0)?9\d{9}/);
  if (!match) return null;
  let phone = match[0].replace(/^\+98|^0098/, "0");
  if (phone.startsWith("9") && phone.length === 10) phone = `0${phone}`;
  return phone.length >= 11 ? phone : null;
}

function extractGrade(text: string): string | null {
  const q = normalize(text);
  const patterns: Array<[RegExp, string]> = [
    [/کلاس\s*(اول|۱|1)\b/, "اول"],
    [/کلاس\s*(دوم|۲|2)\b/, "دوم"],
    [/کلاس\s*(سوم|۳|3)\b/, "سوم"],
    [/کلاس\s*(چهارم|۴|4)\b/, "چهارم"],
    [/کلاس\s*(پنجم|۵|5)\b/, "پنجم"],
    [/کلاس\s*(ششم|۶|6)\b/, "ششم"],
    [/کلاس\s*(هفتم|۷|7)\b/, "هفتم"],
    [/کلاس\s*(هشتم|۸|8)\b/, "هشتم"],
    [/کلاس\s*(نهم|۹|9)\b/, "نهم"],
    [/کلاس\s*(دهم|۱۰|10)\b/, "دهم"],
    [/کلاس\s*(یازدهم|۱۱|11)\b/, "یازدهم"],
    [/کلاس\s*(دوازدهم|۱۲|12)\b/, "دوازدهم"],
    [/پایه\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم)/, ""],
  ];

  for (const [regex, label] of patterns) {
    const m = q.match(regex);
    if (!m) continue;
    if (label) return label;
    return m[1] ?? null;
  }
  return null;
}

function extractName(text: string): string | null {
  const q = normalize(text);
  const patterns = [
    /(?:نام\s*من|اسم\s*من|من)\s+([آ-یءٔا-ی]{2,}(?:\s+[آ-یءٔا-ی]{2,}){0,2})/,
    /(?:فرزندم|دخترم|پسرم)\s+([آ-یءٔا-ی]{2,})/,
  ];
  for (const pattern of patterns) {
    const match = q.match(pattern);
    const name = match?.[1]?.trim();
    if (name && !/(کلاس|ثبت|مشاور|تماس)/.test(name)) return name;
  }
  return null;
}

function extractCity(text: string): string | null {
  const q = normalize(text);
  const cities = [
    "نسیم شهر",
    "نسیم‌شهر",
    "تهران",
    "اسلامشهر",
    "رباط کریم",
    "شهریار",
    "پرند",
  ];
  for (const city of cities) {
    if (q.includes(city.replace("‌", " ")) || q.includes(city)) {
      return city.replace("‌", "‌");
    }
  }
  const match = q.match(/(?:ساکن|از|شهر)\s+([آ-یءٔا-ی]{2,})/);
  return match?.[1] ?? null;
}

function extractBranch(text: string): string | null {
  const q = normalize(text);
  if (/شعبه\s*دختران|دختران/.test(q)) return "شعبه دختران";
  if (/شعبه\s*پسران|پسران/.test(q)) return "شعبه پسران";
  if (/دبستان/.test(q)) return "دبستان ستارگان آینده";
  return null;
}

function extractTime(text: string): string | null {
  const q = normalize(text);
  if (/صبح/.test(q)) return "صبح";
  if (/ظهر/.test(q)) return "ظهر";
  if (/عصر/.test(q)) return "عصر";
  if (/شب/.test(q)) return "شب";
  const match = q.match(/(?:ساعت|رأس)\s*([۰-۹0-9]{1,2}(?::[۰-۹0-9]{2})?)/);
  return match?.[1] ?? null;
}

function extractService(text: string): string | null {
  const q = normalize(text);
  if (/دبستان|ابتدایی/.test(q)) return "دبستان";
  if (/قلم\s*چی|قلم‌چی/.test(q)) return "قلم‌چی";
  if (/باشگاه تابستانی|تابستان/.test(q)) return "باشگاه تابستانی";
  if (/تیزهوشان|نمونه دولتی/.test(q)) return "آمادگی تیزهوشان";
  if (/مشاوره/.test(q)) return "مشاوره";
  if (/تقویتی|کنکور|دوره/.test(q)) return "آموزشگاه تقویتی";
  return null;
}

function extractSchool(text: string): string | null {
  const q = normalize(text);
  if (/ستارگان آینده/.test(q)) return "دبستان غیردولتی ستارگان آینده";
  const match = q.match(/مدرسه\s+([آ-یءٔا-ی0-9\s]{2,40})/);
  return match?.[1]?.trim() ?? null;
}

/**
 * Extract structured CRM entities from free-text conversation.
 */
export function extractCrmEntities(
  text: string,
  previous?: Partial<AiCrmEntities>,
): AiCrmEntities {
  const base: AiCrmEntities = {
    name: previous?.name ?? null,
    phone: previous?.phone ?? null,
    grade: previous?.grade ?? null,
    city: previous?.city ?? null,
    school: previous?.school ?? null,
    service: previous?.service ?? null,
    preferred_time: previous?.preferred_time ?? null,
    preferred_branch: previous?.preferred_branch ?? null,
  };

  return {
    name: extractName(text) ?? base.name,
    phone: extractPhone(text) ?? base.phone,
    grade: extractGrade(text) ?? base.grade,
    city: extractCity(text) ?? base.city,
    school: extractSchool(text) ?? base.school,
    service: extractService(text) ?? base.service,
    preferred_time: extractTime(text) ?? base.preferred_time,
    preferred_branch: extractBranch(text) ?? base.preferred_branch,
  };
}
